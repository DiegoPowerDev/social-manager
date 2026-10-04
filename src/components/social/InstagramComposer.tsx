"use client";

import { useState, useRef } from "react";
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

interface Props {
  username: string;
  onPublish: (data: {
    caption: string;
    imageUrl?: string;
    videoUrl?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function InstagramComposer({
  username,
  onPublish,
  loading = false,
}: Props) {
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
  const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // Instagram es más estricto

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaError(null);

    if (file.size > MAX_IMAGE_SIZE) {
      setMediaError("La imagen es demasiado grande (máximo 8MB)");
      return;
    }

    setVideoFile(null);
    setVideoPreview(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaError(null);

    if (file.size > MAX_VIDEO_SIZE) {
      setMediaError("El video es demasiado grande (máximo 100MB)");
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }

    setImageFile(null);
    setImagePreview(null);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setImageFile(null);
    setVideoFile(null);
    setImagePreview(null);
    setVideoPreview(null);
    setMediaError(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const uploadToR2 = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "instagram");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error al subir el archivo");
    }

    const data = await res.json();
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!imageFile && !videoFile) {
      setMediaError("Instagram requiere una imagen o un video");
      return;
    }

    try {
      setUploading(true);
      setMediaError(null);

      let imageUrl: string | undefined;
      let videoUrl: string | undefined;

      if (imageFile) {
        imageUrl = await uploadToR2(imageFile);
      }
      if (videoFile) {
        videoUrl = await uploadToR2(videoFile);
      }

      await onPublish({
        caption,
        imageUrl,
        videoUrl,
      });

      // Limpiar solo si fue exitoso
      setCaption("");
      removeMedia();
    } catch (error: any) {
      console.error(error);
      setMediaError(error.message || "Error al publicar");
    } finally {
      setUploading(false);
    }
  };

  const isLoading = loading || uploading;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Nueva publicación</CardTitle>
            <CardDescription>Publicando en @{username}</CardDescription>
          </div>
          <Badge variant="secondary">Instagram</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <Textarea
          placeholder="Escribe un pie de foto..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          disabled={isLoading}
        />

        {(imagePreview || videoPreview) && (
          <div className="relative rounded-lg overflow-hidden border bg-muted/30">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-80 object-contain"
              />
            )}
            {videoPreview && (
              <video src={videoPreview} controls className="w-full max-h-80" />
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

        <div className="flex items-center justify-between">
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
              disabled={!!videoFile || isLoading}
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              Imagen
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              disabled={!!imageFile || isLoading}
            >
              <Video className="h-4 w-4 mr-2" />
              Video / Reel
            </Button>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isLoading || (!imageFile && !videoFile)}
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

        <div className="text-xs text-muted-foreground">
          {mediaError ? (
            <span className="text-red-500">{mediaError}</span>
          ) : (
            <span>
              Imágenes máx. 8MB · Videos máx. 100MB · Solo JPEG recomendado
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
