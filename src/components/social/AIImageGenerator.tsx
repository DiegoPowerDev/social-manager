"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, ImagePlus, X } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAiUsage } from "@/app/hooks/useAiUsage";
import { canUseAi } from "@/content/access";
import { AiLockedOverlay } from "../auth/AiLockedOverlay";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";

interface Props {
  onGenerate: (imageUrl: string) => void;
}

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const MAX_REFS = 3;
const MAX_REF_SIZE = 8 * 1024 * 1024;

const STYLES = [
  {
    value: "realistic",
    label: "Realista / Fotográfico",
    suffix:
      "photorealistic, highly detailed, natural lighting, 8k, professional photography",
  },
  {
    value: "cinematic",
    label: "Cinematográfico",
    suffix:
      "cinematic lighting, dramatic atmosphere, movie still, depth of field, high quality",
  },
  {
    value: "minimalist",
    label: "Minimalista",
    suffix:
      "minimalist style, clean composition, simple background, elegant, high-end product photography",
  },
  {
    value: "futuristic",
    label: "Futurista / Cyberpunk",
    suffix:
      "futuristic, cyberpunk style, neon lights, sci-fi, highly detailed, cinematic",
  },
  {
    value: "illustration",
    label: "Ilustración / Digital Art",
    suffix:
      "digital illustration, vibrant colors, artistic style, detailed artwork",
  },
  {
    value: "3d",
    label: "3D Render",
    suffix:
      "3D render, octane render, highly detailed, studio lighting, realistic materials",
  },
  {
    value: "vintage",
    label: "Vintage / Retro",
    suffix: "vintage style, retro aesthetic, film grain, nostalgic, warm tones",
  },
  {
    value: "product",
    label: "Producto profesional",
    suffix:
      "professional product photography, clean white background, studio lighting, commercial style",
  },
];

/** Formatos típicos de redes */
const FORMATS = [
  { value: "1:1", label: "1:1 · Cuadrado (feed)" },
  { value: "4:5", label: "4:5 · Retrato (Instagram)" },
  { value: "9:16", label: "9:16 · Stories / Reels" },
  { value: "16:9", label: "16:9 · Horizontal / YouTube" },
  { value: "3:2", label: "3:2 · Foto clásica" },
  { value: "21:9", label: "21:9 · Banner ancho" },
] as const;

type RefMode = "guide" | "edit";
type RefItem = { file: File; preview: string };

function ratioToGeminiAspect(w: number, h: number): string {
  if (!w || !h) return "1:1";
  const r = w / h;
  if (r >= 2.0) return "21:9";
  if (r >= 1.6) return "16:9";
  if (r >= 1.35) return "3:2";
  if (r >= 1.15) return "4:3";
  if (r >= 0.95) return "1:1";
  if (r >= 0.8) return "4:5";
  if (r >= 0.7) return "3:4";
  if (r >= 0.55) return "2:3";
  return "9:16";
}

function getImageDimensions(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

export function AIImageGenerator({ onGenerate }: Props) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [format, setFormat] = useState("1:1");
  const [refMode, setRefMode] = useState<RefMode>("guide");
  const [refs, setRefs] = useState<RefItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const { imagesLeft, imagesUsed, imagesLimit, setFromApi } = useAiUsage();
  const companyId = useAuthStore((s) => s.companyId);
  const memberRole = useAuthStore((s) => s.memberRole);
  const aiEnabledPlan = useAuthStore((s) => s.aiEnabled);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { allowed, reason } = canUseAi({
    role: memberRole,
    aiEnabled: aiEnabledPlan !== false,
  });

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const next: RefItem[] = [...refs];
    for (const file of files) {
      if (next.length >= MAX_REFS) break;
      if (file.size > MAX_REF_SIZE) {
        toast.error(`"${file.name}" supera 8MB`);
        continue;
      }
      if (!file.type.startsWith("image/")) continue;
      next.push({ file, preview: URL.createObjectURL(file) });
    }
    setRefs(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeReference = (index: number) => {
    setRefs((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  };

  const uploadReferenceToR2 = async (file: File): Promise<string> => {
    if (!companyId) {
      throw new Error(
        "No hay empresa asociada. Recarga la página o vuelve a iniciar sesión.",
      );
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "ai-reference");
    formData.append("companyId", companyId);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.code === "STORAGE_FULL" || res.status === 403) {
        throw new Error(data.error || "Error al subir el logo");
      } else {
        throw new Error(data.error || "Error al subir el logo");
      }
    }
    return data.publicUrl as string;
  };

  const buildFinalPrompt = () => {
    const selectedStyle = STYLES.find((s) => s.value === style);
    const base = selectedStyle
      ? `${prompt.trim()}, ${selectedStyle.suffix}`
      : prompt.trim();

    if (refs.length === 0) return base;

    if (refMode === "edit") {
      return (
        `${base}. Edit the first provided reference image. ` +
        `Apply only the requested changes. Preserve composition, framing, layout and aspect ratio. ` +
        `Do not crop to square. Do not redesign the entire image from scratch.`
      );
    }

    // guide
    return (
      `${base}. Use the reference image(s) only as visual guidance for subject, style, colors or product. ` +
      `Create a new scene as described in the prompt. Do not copy the reference framing or canvas size.`
    );
  };

  const handleGenerate = async () => {
    if (!allowed) return;
    if (!prompt.trim()) {
      toast.error("Escribe un prompt descriptivo");
      return;
    }
    if (!companyId) {
      toast.error("No hay empresa asociada");
      return;
    }
    if (!aiEnabledPlan) {
      toast.error("Tu plan no incluye IA");
      return;
    }
    if (imagesLeft <= 0) {
      toast.error("Sin imágenes disponibles este mes");
      return;
    }
    if (refMode === "edit" && refs.length === 0) {
      toast.error("Para editar, sube al menos una imagen de referencia");
      return;
    }

    setLoading(true);
    setGeneratedUrl(null);
    const tid = toast.loading("Generando imagen…");

    try {
      const imageUrls: string[] = [];
      for (const ref of refs) {
        imageUrls.push(await uploadReferenceToR2(ref.file));
      }

      let aspectRatio = format;
      if (refMode === "edit" && refs[0]) {
        try {
          const { w, h } = await getImageDimensions(refs[0].file);
          aspectRatio = ratioToGeminiAspect(w, h);
        } catch {
          /* se mantiene format */
        }
      }

      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          prompt: buildFinalPrompt(),
          imageUrl: imageUrls[0],
          imageUrls,
          companyId,
          aspectRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar la imagen");

      setGeneratedUrl(data.imageUrl);
      if (data.usage) {
        setFromApi({
          aiCaptions: data.usage.aiCaptions,
          aiImages: data.usage.aiImages,
        });
      }
      toast.success("Imagen generada", { id: tid });
    } catch (err: any) {
      toast.error(err.message || "Ocurrió un error al generar la imagen", {
        id: tid,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUseImage = () => {
    if (generatedUrl) {
      onGenerate(generatedUrl);
      toast.success("Imagen aplicada al post");
    }
  };

  useEffect(() => {
    if (refs.length === 0 && refMode === "edit") {
      setRefMode("guide");
    }
  }, [refs.length, refMode]);

  return (
    <div className="relative space-y-3 p-4 flex flex-col w-full">
      {!allowed && <AiLockedOverlay reason={reason} />}
      <div
        className={cn(!allowed && "pointer-events-none select-none opacity-40")}
      >
        <div className="space-y-4 p-4 w-full flex flex-col">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Generar imagen con IA
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-prompt">Describe la imagen</Label>
            <Textarea
              id="image-prompt"
              className="resize-none bg-white text-black"
              rows={3}
              placeholder={
                refMode === "edit"
                  ? "Ej: Quita el bloque de publicidad de la derecha y deja el resto igual"
                  : "Ej: Paisaje al atardecer con animales; incluye un perro como el de la referencia"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading || !allowed}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Estilo</Label>
              <Select
                value={style}
                onValueChange={(v) => setStyle(v as any)}
                disabled={loading || !allowed}
              >
                <SelectTrigger className="w-full bg-white text-black">
                  <SelectValue placeholder="Selecciona un estilo">
                    {STYLES.find((s) => s.value === style)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]">
                  {STYLES.map((s) => (
                    <SelectItem
                      key={s.value}
                      value={s.value}
                      className="cursor-pointer"
                    >
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Formato</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as any)}
                disabled={
                  loading || !allowed || (refMode === "edit" && refs.length > 0)
                }
              >
                <SelectTrigger className="w-full bg-white text-black">
                  <SelectValue placeholder="Formato del post">
                    {FORMATS.find((f) => f.value === format)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]">
                  {FORMATS.map((f) => (
                    <SelectItem
                      key={f.value}
                      value={f.value}
                      className="cursor-pointer"
                    >
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {refMode === "edit" && refs.length > 0 && (
                <p className="text-[11px] text-white/50">
                  En modo editar se usa el formato de tu imagen de referencia.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imágenes de referencia (opcional, máx. {MAX_REFS})</Label>

            {refs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setRefMode("guide")}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs border transition",
                    refMode === "guide"
                      ? "bg-yellow-500 text-black border-yellow-500"
                      : "bg-white/10 border-white/20 text-white/80 hover:bg-white/15",
                  )}
                >
                  Usar como guía
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setRefMode("edit")}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs border transition",
                    refMode === "edit"
                      ? "bg-yellow-500 text-black border-yellow-500"
                      : "bg-white/10 border-white/20 text-white/80 hover:bg-white/15",
                  )}
                >
                  Editar la 1ª imagen
                </button>
              </div>
            )}

            <p className="text-xs text-white/60">
              {refs.length === 0
                ? "Opcional: sube fotos de producto, estilo o una imagen a retocar."
                : refMode === "edit"
                  ? "Se modificará la primera imagen según tu descripción"
                  : "Las fotos solo orientan estilo o sujeto; el formato lo eliges arriba."}
            </p>

            <div className="flex flex-wrap gap-2">
              {refs.map((ref, i) => {
                const isEditTarget = refMode === "edit" && i === 0;
                return (
                  <div
                    key={ref.preview}
                    className={cn(
                      "relative w-20 h-20 rounded-md overflow-hidden border-2 transition",
                      isEditTarget
                        ? "border-yellow-400 ring-2 ring-yellow-400/60 scale-105 z-10"
                        : "border-white/40 opacity-80",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ref.preview}
                      alt={`Ref ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {isEditTarget && (
                      <span className="absolute bottom-0 inset-x-0 bg-yellow-500 text-black text-[9px] font-semibold text-center py-0.5">
                        Se edita
                      </span>
                    )}
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full"
                      onClick={() => removeReference(i)}
                      disabled={loading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}

              {refs.length < MAX_REFS && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    onChange={handleReferenceChange}
                    className="hidden"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-20 w-20 flex flex-col gap-1 hover:opacity-80"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || !allowed}
                  >
                    <ImagePlus className="h-5 w-5" color="black" />
                    <span className="text-[10px] text-black">Añadir</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-white/60 text-center">
            {aiEnabledPlan
              ? `${imagesLeft} imágenes restantes este mes (${imagesUsed}/${imagesLimit})`
              : "Tu plan no incluye IA"}
          </p>

          <Button
            onClick={handleGenerate}
            disabled={
              loading ||
              !allowed ||
              !prompt.trim() ||
              imagesLeft <= 0 ||
              !companyId
            }
            className="w-full bg-gradient-to-r from-orange-400 to-yellow-500 h-10 text-white"
            variant="secondary"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando imagen...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generar imagen
              </>
            )}
          </Button>

          {generatedUrl && (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={generatedUrl}
                  alt="Imagen generada"
                  className="w-full max-h-72 object-contain"
                />
              </div>
              <Button onClick={handleUseImage} className="w-full">
                Usar esta imagen en el post
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
