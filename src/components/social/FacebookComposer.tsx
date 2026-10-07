"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, Video, Link as LinkIcon, X, Loader2 } from "lucide-react";
import { AICaptionGenerator } from "@/components/social/AICaptionGenerator";
import { AIImageGenerator } from "@/components/social/AIImageGenerator";

interface Props {
  pageName: string;
  loading?: boolean;
  // Estado controlado
  message: string;
  onMessageChange: (value: string) => void;
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  videoUrl: string | null;
  onVideoChange: (url: string | null) => void;
  link: string;
  onLinkChange: (value: string) => void;
  onPublish: () => Promise<void>;
}

export function FacebookComposer({
  pageName,
  loading = false,
  message,
  onMessageChange,
  imageUrl,
  onImageChange,
  videoUrl,
  onVideoChange,
  link,
  onLinkChange,
  onPublish,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaError(null);
    if (file.size > MAX_IMAGE_SIZE) {
      setMediaError("La imagen es demasiado grande (máximo 10MB)");
      return;
    }

    // Limpiamos video
    onVideoChange(null);

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("platform", "facebook");

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
      formData.append("platform", "facebook");

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
    if (!message.trim() && !imageUrl && !videoUrl) return;
    await onPublish();
  };

  const isLoading = loading || uploading;
  const characterCount = message.length;
  const isOverLimit = characterCount > 63206;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Nueva publicación</CardTitle>
            <CardDescription>Publicando en {pageName}</CardDescription>
          </div>
          <Badge variant="secondary">Facebook</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Generador de Captions */}
        <AICaptionGenerator
          platform="facebook"
          onGenerate={(caption) => onMessageChange(caption)}
        />

        {/* Generador de Imágenes */}
        <AIImageGenerator
          onGenerate={(url) => {
            onImageChange(url);
            onVideoChange(null);
          }}
        />

        {/* Texto */}
        <div className="space-y-2">
          <Textarea
            placeholder="¿Qué quieres publicar?"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            rows={5}
            className="resize-none"
            disabled={isLoading}
          />
          <div className="flex justify-end">
            <span
              className={`text-xs ${isOverLimit ? "text-red-500" : "text-muted-foreground"}`}
            >
              {characterCount.toLocaleString()} caracteres
            </span>
          </div>
        </div>

        {/* Preview de media */}
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
              <video src={videoUrl} controls className="w-full max-h-64" />
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

        {/* Enlace */}
        <div className="space-y-2">
          <Label htmlFor="link" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Enlace (opcional)
          </Label>
          <Input
            id="link"
            placeholder="https://ejemplo.com"
            value={link}
            onChange={(e) => onLinkChange(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Botones */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
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
              disabled={!!videoUrl || isLoading}
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
              Video
            </Button>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              isOverLimit ||
              (!message.trim() && !imageUrl && !videoUrl)
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
