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

interface Props {
  onGenerate: (imageUrl: string) => void;
}

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

export function AIImageGenerator({ onGenerate }: Props) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError("La imagen de referencia no puede superar los 8MB");
      return;
    }

    setReferenceFile(file);
    setReferencePreview(URL.createObjectURL(file));
    setError(null);
  };

  const removeReference = () => {
    setReferenceFile(null);
    setReferencePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadReferenceToR2 = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "ai-reference");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Error al subir la imagen de referencia");
    }

    const data = await res.json();
    return data.publicUrl;
  };

  const buildFinalPrompt = () => {
    const selectedStyle = STYLES.find((s) => s.value === style);
    if (!selectedStyle) return prompt;

    if (referenceFile) {
      return `${prompt}, ${selectedStyle.suffix}`;
    }

    return `${prompt}, ${selectedStyle.suffix}`;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Escribe un prompt descriptivo");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedUrl(null);

    try {
      let referenceImageUrl: string | undefined;

      if (referenceFile) {
        referenceImageUrl = await uploadReferenceToR2(referenceFile);
      }

      const finalPrompt = buildFinalPrompt();

      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          imageUrl: referenceImageUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al generar la imagen");
      }

      setGeneratedUrl(data.imageUrl);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al generar la imagen");
    } finally {
      setLoading(false);
    }
  };

  const handleUseImage = () => {
    if (generatedUrl) {
      onGenerate(generatedUrl);
    }
  };

  return (
    <div className="space-y-4 p-4 w-full flex flex-col">
      <div className=" flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-purple-500" />
        Generar imagen con IA
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <Label htmlFor="image-prompt">Describe la imagen</Label>
        <Textarea
          id="image-prompt"
          className="resize-none bg-white"
          placeholder="Ej: Un café latte sobre una mesa de madera con luz natural..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={loading}
        />
      </div>

      {/* Estilo */}
      <div className="space-y-2">
        <Label>Estilo</Label>
        <Select
          value={style}
          onValueChange={(v) => setStyle(v as any)}
          disabled={loading}
        >
          <SelectTrigger className="bg-white">
            <SelectValue className="w-40" placeholder="Selecciona un estilo" />
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

      {/* Imagen de referencia */}
      <div className="space-y-2">
        <Label>Imagen de referencia (opcional)</Label>
        <p className="text-xs text-muted-foreground">
          Sube una imagen si quieres que la IA la modifique.
        </p>

        {referencePreview ? (
          <div className="relative w-28 h-28 rounded-md overflow-hidden border">
            <img
              src={referencePreview}
              alt="Referencia"
              className="w-full h-full object-cover"
            />
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 rounded-full"
              onClick={removeReference}
              disabled={loading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleReferenceChange}
              className="hidden"
              disabled={loading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              Subir referencia
            </Button>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="w-full bg-yellow-500/30 h-10 hover:bg-yellow-500/20"
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

      {/* Resultado */}
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
