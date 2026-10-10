"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, Video, X, Loader2 } from "lucide-react";
import { AICaptionGenerator } from "@/components/social/AICaptionGenerator";
import { AIImageGenerator } from "@/components/social/AIImageGenerator";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/useAuthStore";

interface Props {
  accountName: string;
  loading?: boolean;
  text: string;
  onTextChange: (value: string) => void;
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  videoUrl: string | null;
  onVideoChange: (url: string | null) => void;
  onPublish: () => Promise<void>;
}

export function LinkedInComposer({
  accountName,
  loading = false,
  text,
  onTextChange,
  imageUrl,
  onImageChange,
  videoUrl,
  onVideoChange,
  onPublish,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const companyId = useAuthStore((s) => s.companyId);

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // LinkedIn single upload ~200MB

  const uploadToR2 = async (file: File) => {
    if (!companyId) {
      throw new Error(
        "No hay empresa asociada. Recarga la página o vuelve a iniciar sesión.",
      );
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "linkedin");
    formData.append("companyId", companyId);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al subir el archivo");
    }

    const data = await res.json();
    return data.publicUrl as string;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaError(null);
    if (file.size > MAX_IMAGE_SIZE) {
      setMediaError("La imagen es demasiado grande (máximo 10MB)");
      return;
    }

    try {
      setUploading(true);
      onVideoChange(null);
      const url = await uploadToR2(file);
      onImageChange(url);
    } catch (err: any) {
      setMediaError(err.message || "Error al subir la imagen");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaError(null);
    if (file.size > MAX_VIDEO_SIZE) {
      setMediaError("El video es demasiado grande (máximo 200MB)");
      return;
    }

    try {
      setUploading(true);
      onImageChange(null);
      const url = await uploadToR2(file);
      onVideoChange(url);
    } catch (err: any) {
      setMediaError(err.message || "Error al subir el video");
    } finally {
      setUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
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
    if (!text.trim() && !imageUrl && !videoUrl) {
      setMediaError("Escribe un texto o agrega una imagen/video");
      return;
    }
    await onPublish();
  };

  const isLoading = loading || uploading;
  const characterCount = text.length;
  const isOverLimit = characterCount > 3000;
  const hasMedia = !!(imageUrl || videoUrl);

  return (
    <Card className="bg-white/70">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Nueva publicación</CardTitle>
            <CardDescription>Publicando como {accountName}</CardDescription>
          </div>
          <Badge variant="secondary">LinkedIn</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Texto + AI Caption */}
        <div className="flex justify-between gap-2 bg-white/60 rounded">
          <AICaptionGenerator
            platform="general"
            onGenerate={(caption) => onTextChange(caption)}
          />
          <Separator orientation="vertical" />
          <div className="flex flex-col w-full gap-2 p-4">
            <span>Escribe el texto de la publicación:</span>
            <Textarea
              placeholder="¿Qué quieres compartir en LinkedIn?"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              rows={5}
              className="resize-none flex-1 bg-white"
              disabled={isLoading}
            />
            <div className="flex justify-end">
              <span
                className={`text-xs ${
                  isOverLimit ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                {characterCount.toLocaleString()} / 3.000
              </span>
            </div>
          </div>
        </div>

        {/* Media + AI Image */}
        <div className="flex justify-between gap-2 bg-white/60 rounded">
          <AIImageGenerator
            onGenerate={(url) => {
              onImageChange(url);
              onVideoChange(null);
            }}
          />
          <Separator orientation="vertical" />
          <div className="flex w-full flex-col gap-2 p-4">
            <span>Imagen o video para publicar:</span>
            <p className="text-xs text-muted-foreground">
              Video: MP4 recomendado, máx. 200MB
            </p>
            <div className="flex items-center justify-center gap-2">
              <input
                type="file"
                accept="image/*"
                ref={imageInputRef}
                onChange={handleImageChange}
                className="hidden"
                disabled={isLoading}
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
                disabled={isLoading}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Imagen
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => videoInputRef.current?.click()}
                disabled={isLoading}
              >
                <Video className="h-4 w-4 mr-2" />
                Video
              </Button>
            </div>

            <div className="flex-1 flex items-center justify-center">
              {imageUrl && (
                <div className="relative rounded-lg overflow-hidden border bg-muted/30">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full max-h-64 object-contain"
                  />
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
              {videoUrl && (
                <div className="relative rounded-lg overflow-hidden border bg-muted/30 w-full">
                  <video src={videoUrl} controls className="w-full max-h-64" />
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
        {videoUrl && (
          <p className="text-sm text-muted-foreground bg-white/60 p-3 rounded">
            LinkedIn video: MP4 recomendado, máx. ~200 MB, hasta ~10 min.
          </p>
        )}
        {/* Botón Publicar */}
        <div className="flex w-full items-center justify-center">
          <Button
            className="w-full max-w-xs h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white shadow-lg shadow-orange-500/25 transition-all"
            onClick={handleSubmit}
            disabled={isLoading || isOverLimit || (!text.trim() && !hasMedia)}
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
