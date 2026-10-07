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
import { ImagePlus, X, Loader2 } from "lucide-react";
import { AICaptionGenerator } from "@/components/social/AICaptionGenerator";
import { AIImageGenerator } from "@/components/social/AIImageGenerator";

interface Props {
  accountName: string;
  loading?: boolean;
  text: string;
  onTextChange: (value: string) => void;
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  onPublish: () => Promise<void>;
}

export function LinkedInComposer({
  accountName,
  loading = false,
  text,
  onTextChange,
  imageUrl,
  onImageChange,
  onPublish,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("platform", "linkedin");

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
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const removeMedia = () => {
    onImageChange(null);
    setMediaError(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!text.trim() && !imageUrl) {
      setMediaError("Escribe un texto o agrega una imagen");
      return;
    }
    await onPublish();
  };

  const isLoading = loading || uploading;
  const characterCount = text.length;
  const isOverLimit = characterCount > 3000;

  return (
    <Card>
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
        <AICaptionGenerator
          platform="general"
          onGenerate={(caption) => onTextChange(caption)}
        />

        <AIImageGenerator onGenerate={(url) => onImageChange(url)} />

        <div className="space-y-2">
          <Textarea
            placeholder="¿Qué quieres compartir en LinkedIn?"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={6}
            className="resize-none"
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

        <div className="flex items-center justify-between">
          <div>
            <input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              onChange={handleImageChange}
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
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isLoading || isOverLimit || (!text.trim() && !imageUrl)}
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
