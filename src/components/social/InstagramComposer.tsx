"use client";

import { useRef, useState } from "react";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ImagePlus, Video, X, Loader2 } from "lucide-react";
import { AICaptionGenerator } from "@/components/social/AICaptionGenerator";
import { AIImageGenerator } from "@/components/social/AIImageGenerator";
import { Separator } from "../ui/separator";
import { useAuthStore } from "@/stores/useAuthStore";

interface Props {
  username: string;
  loading?: boolean;
  caption: string;
  onCaptionChange: (value: string) => void;
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  videoUrl: string | null;
  onVideoChange: (url: string | null) => void;
  mediaType: "FEED" | "REELS" | "STORIES";
  onMediaTypeChange: (value: "FEED" | "REELS" | "STORIES") => void;
  onPublish: () => Promise<void>;
}

export function InstagramComposer({
  username,
  loading = false,
  caption,
  onCaptionChange,
  imageUrl,
  onImageChange,
  videoUrl,
  onVideoChange,
  mediaType,
  onMediaTypeChange,
  onPublish,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const companyId = useAuthStore((s) => s.companyId);

  const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
  const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaError(null);
    if (file.size > MAX_IMAGE_SIZE) {
      setMediaError("La imagen es demasiado grande (máximo 8MB)");
      return;
    }

    onVideoChange(null);

    try {
      setUploading(true);
      if (!companyId) {
        throw new Error(
          "No hay empresa asociada. Recarga la página o vuelve a iniciar sesión.",
        );
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("platform", "instagram");
      formData.append("companyId", companyId);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error al subir la imagen");

      const data = await res.json();
      onImageChange(data.publicUrl);
    } catch (err: any) {
      setMediaError(err.message || "Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaError(null);
    if (file.size > MAX_VIDEO_SIZE) {
      setMediaError("El video es demasiado grande (máximo 100MB)");
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }

    onImageChange(null);

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("platform", "instagram");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error al subir el video");

      const data = await res.json();
      onVideoChange(data.publicUrl);
    } catch (err: any) {
      setMediaError(err.message || "Error al subir el video");
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = () => {
    onImageChange(null);
    onVideoChange(null);
    setMediaError(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    // Validaciones según el tipo
    if (mediaType === "REELS" && !videoUrl) {
      setMediaError("Los Reels requieren un video");
      return;
    }

    if (mediaType === "STORIES" && !imageUrl && !videoUrl) {
      setMediaError("Las Historias requieren una imagen o un video");
      return;
    }

    if (mediaType === "FEED" && !imageUrl && !videoUrl) {
      setMediaError("Instagram requiere una imagen o un video");
      return;
    }

    await onPublish();
  };

  const isLoading = loading || uploading;

  return (
    <Card className="bg-white/70">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Nueva publicación</CardTitle>
            <CardDescription>Crear Publicación</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Tipo de publicación */}
        <div className="space-y-2">
          <Label>Tipo de publicación</Label>
          <Select
            value={mediaType}
            onValueChange={(value) =>
              onMediaTypeChange(value as "FEED" | "REELS" | "STORIES")
            }
            disabled={isLoading}
          >
            <SelectTrigger className="bg-white">
              <SelectValue className="w-64" placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FEED">Publicación (Feed)</SelectItem>
              <SelectItem value="REELS">Reel</SelectItem>
              <SelectItem value="STORIES">Historia</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {mediaType === "REELS" &&
              "Los Reels requieren un video vertical (recomendado 9:16)"}
            {mediaType === "STORIES" &&
              "Las Historias duran 24 horas · Formato vertical recomendado"}
            {mediaType === "FEED" && "Publicación normal en el perfil"}
          </p>
        </div>

        {/* Generador de Captions (no se muestra en Historias) */}

        <div className="flex justify-between gap-2 bg-white/60 rounded">
          {mediaType !== "STORIES" && (
            <AICaptionGenerator
              platform="instagram"
              onGenerate={(generated) => onCaptionChange(generated)}
            />
          )}
          <Separator orientation="vertical" />
          {mediaType !== "STORIES" && (
            <div className="flex flex-col w-full gap-2 p-4">
              <span>Ingresa un caption para publicar:</span>
              <Textarea
                placeholder="Escribe un pie de foto..."
                value={caption}
                onChange={(e) => onCaptionChange(e.target.value)}
                rows={4}
                className="resize-none flex-1 flex bg-white"
                disabled={isLoading}
              />
            </div>
          )}
          {/* Generador de Imágenes */}
        </div>

        <div className="flex justify-between gap-2 bg-white/60 rounded">
          <AIImageGenerator
            onGenerate={(url) => {
              onImageChange(url);
              onVideoChange(null);
            }}
          />{" "}
          <Separator orientation="vertical" />
          <div className="flex w-full flex-col gap-2 p-4">
            <span>Ingresa una imagen para publicar:</span>
            <div className="flex items-center justify-center gap-2">
              <input
                type="file"
                accept="image/*"
                ref={imageInputRef}
                onChange={handleImageChange}
                className="hidden"
                disabled={isLoading || mediaType === "REELS"}
              />
              <input
                type="file"
                accept="video/*"
                ref={videoInputRef}
                onChange={handleVideoChange}
                className="hidden"
                disabled={isLoading}
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                disabled={!!videoUrl || isLoading || mediaType === "REELS"}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Imagen
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => videoInputRef.current?.click()}
                disabled={!!imageUrl || isLoading}
              >
                <Video className="h-4 w-4 mr-2" />
                Video {mediaType === "REELS" ? "/ Reel" : ""}
              </Button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {(imageUrl || videoUrl) && (
                <div className="relative rounded-lg overflow-hidden border bg-muted/30">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full max-h-64 object-contain"
                    />
                  )}
                  {videoUrl && (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full max-h-64"
                    />
                  )}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={removeMedia}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-center">
          <Button
            className="w-full max-w-xs h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white shadow-lg shadow-orange-500/25 transition-all"
            onClick={handleSubmit}
            disabled={
              isLoading ||
              (mediaType === "REELS" && !videoUrl) ||
              (mediaType !== "REELS" && !imageUrl && !videoUrl)
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploading ? "Subiendo..." : "Publicando..."}
              </>
            ) : (
              "Publicar ahora"
            )}
          </Button>
        </div>

        {mediaError && <p className="text-sm text-red-500">{mediaError}</p>}
      </CardContent>
    </Card>
  );
}
