"use client";

import { useState, useRef } from "react";
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

interface Props {
  onGenerate: (imageUrl: string) => void;
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

type RefItem = { file: File; preview: string };

export function AIImageGenerator({ onGenerate }: Props) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [refs, setRefs] = useState<RefItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const { aiEnabled, imagesLeft, imagesUsed, imagesLimit, setFromApi } =
    useAiUsage();
  const companyId = useAuthStore((s) => s.companyId);
  const aiEnabledPlan = useAuthStore((s) => s.aiEnabled);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setError(null);
    const next: RefItem[] = [...refs];

    for (const file of files) {
      if (next.length >= MAX_REFS) break;
      if (file.size > MAX_REF_SIZE) {
        setError(`"${file.name}" supera 8MB`);
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

    if (!res.ok) throw new Error("Error al subir una imagen de referencia");

    const data = await res.json();
    return data.publicUrl as string;
  };

  const buildFinalPrompt = () => {
    const selectedStyle = STYLES.find((s) => s.value === style);
    const base = selectedStyle
      ? `${prompt.trim()}, ${selectedStyle.suffix}`
      : prompt.trim();

    if (refs.length > 1) {
      return (
        `${base}. Use the reference images as visual guidance: ` +
        `match architecture, materials, colors and style. ` +
        `Generate the scene described in the prompt guided by those references.`
      );
    }
    return base;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Escribe un prompt descriptivo");
      return;
    }
    if (!companyId) {
      setError("No hay empresa asociada");
      return;
    }
    if (!aiEnabledPlan) {
      setError("Tu plan no incluye IA");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedUrl(null);

    try {
      const imageUrls: string[] = [];
      for (const ref of refs) {
        imageUrls.push(await uploadReferenceToR2(ref.file));
      }

      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildFinalPrompt(),
          imageUrl: imageUrls[0], // compat
          imageUrls, // multi
          companyId,
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
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al generar la imagen");
    } finally {
      setLoading(false);
    }
  };

  const handleUseImage = () => {
    if (generatedUrl) onGenerate(generatedUrl);
  };

  return (
    <div className="space-y-4 p-4 w-full flex flex-col">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-purple-500" />
        Generar imagen con IA
      </div>

      <div className="space-y-2">
        <Label htmlFor="image-prompt">Describe la imagen</Label>
        <Textarea
          id="image-prompt"
          className="resize-none  bg-white text-black"
          placeholder="Ej: Interior moderno del salón de esta casa, luz natural, mismos materiales..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label>Estilo</Label>
        <Select
          value={style}
          onValueChange={(s) => setStyle(s as any)}
          disabled={loading}
        >
          <SelectTrigger className="bg-white text-black">
            <SelectValue placeholder="Selecciona un estilo" />
          </SelectTrigger>
          <SelectContent>
            {STYLES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Imágenes de referencia (opcional, máx. {MAX_REFS})</Label>
        <p className="text-xs text-white/60">
          Ej: fachada + materiales + estilo. La IA usará estas fotos como guía.
        </p>

        <div className="flex flex-wrap gap-2">
          {refs.map((ref, i) => (
            <div
              key={ref.preview}
              className="relative w-20 h-20 rounded-md overflow-hidden border-white/80"
            >
              <img
                src={ref.preview}
                alt={`Ref ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full"
                onClick={() => removeReference(i)}
                disabled={loading}
              >
                <X className="h-3 w-3 " />
              </Button>
            </div>
          ))}

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
                disabled={loading}
              >
                <ImagePlus className="h-5 w-5" color="black" />
                <span className="text-[10px] text-black">Añadir</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <p className="text-xs text-white/60 text-center">
        {aiEnabledPlan
          ? `${imagesLeft} imágenes restantes este mes (${imagesUsed}/${imagesLimit})`
          : "Tu plan no incluye IA"}
      </p>

      <Button
        onClick={handleGenerate}
        disabled={
          loading ||
          !prompt.trim() ||
          !aiEnabled ||
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
  );
}
