"use client";

import { useState, useRef } from "react";
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

interface Props {
  pageName: string;
  onPublish: (data: {
    message: string;
    link?: string;
    imageUrl?: string;
    videoUrl?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function FacebookComposer({
  pageName,
  onPublish,
  loading = false,
}: Props) {
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFile(null);
    setVideoPreview(null);

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  // Sube el archivo a R2 y devuelve la URL pública
  const uploadToR2 = async (file: File): Promise<string> => {
    // 1. Pedimos la presigned URL
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    });

    if (!res.ok) {
      throw new Error("No se pudo generar la URL de subida");
    }

    const { uploadUrl, publicUrl } = await res.json();

    // 2. Subimos el archivo directamente a R2
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadRes.ok) {
      throw new Error("Error al subir el archivo a R2");
    }

    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!message.trim() && !imageFile && !videoFile) return;

    try {
      setUploading(true);

      let imageUrl: string | undefined;
      let videoUrl: string | undefined;

      // Subir imagen si existe
      if (imageFile) {
        imageUrl = await uploadToR2(imageFile);
      }

      // Subir video si existe
      if (videoFile) {
        videoUrl = await uploadToR2(videoFile);
      }

      // Llamamos al onPublish con las URLs ya subidas
      await onPublish({
        message,
        link: link.trim() || undefined,
        imageUrl,
        videoUrl,
      });

      // Solo limpiamos si todo salió bien
      setMessage("");
      setLink("");
      removeMedia();
    } catch (error) {
      console.error("Error al publicar:", error);
      // No limpiamos el formulario si falla
    } finally {
      setUploading(false);
    }
  };

  const characterCount = message.length;
  const isOverLimit = characterCount > 63206;
  const isLoading = loading || uploading;

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
        {/* Texto */}
        <div className="space-y-2">
          <Textarea
            placeholder="¿Qué quieres publicar?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="resize-none"
            disabled={isLoading}
          />
          <div className="flex justify-end">
            <span
              className={`text-xs ${
                isOverLimit ? "text-red-500" : "text-muted-foreground"
              }`}
            >
              {characterCount.toLocaleString()} caracteres
            </span>
          </div>
        </div>

        {/* Preview de media */}
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

        {/* Enlace opcional */}
        <div className="space-y-2">
          <Label htmlFor="link" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Enlace (opcional)
          </Label>
          <Input
            id="link"
            placeholder="https://ejemplo.com"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Botones de media + Publicar */}
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
              Video
            </Button>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              isOverLimit ||
              (!message.trim() && !imageFile && !videoFile)
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
      </CardContent>
    </Card>
  );
}
