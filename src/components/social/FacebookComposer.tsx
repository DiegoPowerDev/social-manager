"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaLibraryPicker } from "@/components/social/MediaLibraryPicker";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ImagePlus,
  Video,
  Link as LinkIcon,
  X,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { AICaptionGenerator } from "@/components/social/AICaptionGenerator";
import { AIImageGenerator } from "@/components/social/AIImageGenerator";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/useAuthStore";
import { saveMediaToLibrary } from "@/lib/media";

interface Props {
  pageName: string;
  loading?: boolean;
  message: string;
  companyId: string;
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
  companyId,
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
  const [libraryOpen, setLibraryOpen] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);

  const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

  const uploadToR2 = async (file: File) => {
    if (!companyId) {
      throw new Error("No hay empresa asociada.");
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "facebook");
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
    const publicUrl = data.publicUrl as string;

    if (user?.uid) {
      try {
        await saveMediaToLibrary({
          companyId,
          uid: user.uid,
          url: publicUrl,
          key: data.key,
          fileName: file.name,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
          source: "upload",
        });
      } catch (e) {
        console.warn("No se pudo guardar en biblioteca:", e);
      }
    }

    return publicUrl;
  };

  const onLibrarySelect = (item: { url: string; type: "image" | "video" }) => {
    setMediaError(null);
    if (item.type === "video") {
      onImageChange(null);
      onVideoChange(item.url);
    } else {
      onVideoChange(null);
      onImageChange(item.url);
    }
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
      setMediaError("El video es demasiado grande (máximo 100MB)");
      if (videoInputRef.current) videoInputRef.current.value = "";
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
    if (!message.trim() && !imageUrl && !videoUrl) return;
    await onPublish();
  };

  const isLoading = loading || uploading;
  const characterCount = message.length;
  const isOverLimit = characterCount > 63206;

  return (
    <Card className="bg-zinc-950/60 ">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Nueva publicación</CardTitle>
            <CardDescription className="text-white/60">
              Publicando en {pageName}
            </CardDescription>
          </div>
          <Badge variant="secondary">Facebook</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex justify-between gap-2 bg-zinc-950/50 text-white rounded">
          <AICaptionGenerator
            platform="facebook"
            onGenerate={(caption) => onMessageChange(caption)}
          />
          <Separator orientation="vertical" />
          <div className="flex flex-col w-full gap-2 p-4">
            <span>Escribe el texto de la publicación:</span>
            <Textarea
              placeholder="¿Qué quieres publicar?"
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              rows={4}
              className="resize-none flex-1 bg-white/80 text-black"
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
        </div>

        <div className="flex justify-between gap-2 bg-zinc-950/50 text-white rounded">
          <AIImageGenerator
            onGenerate={(url) => {
              onImageChange(url);
              onVideoChange(null);
            }}
          />
          <Separator orientation="vertical" />
          <div className="flex w-full flex-col gap-2 p-4">
            <span>Imagen o video para publicar:</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
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
                className="text-black"
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
                className="text-black"
                onClick={() => videoInputRef.current?.click()}
                disabled={!!imageUrl || isLoading}
              >
                <Video className="h-4 w-4 mr-2" />
                Video
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setLibraryOpen(true)}
                disabled={isLoading}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Biblioteca
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

        <div className="space-y-2">
          <Label htmlFor="link" className="flex items-center text-white gap-2">
            <LinkIcon className="h-4 w-4" />
            Enlace (opcional)
          </Label>
          <Input
            id="link"
            placeholder="https://ejemplo.com"
            value={link}
            onChange={(e) => onLinkChange(e.target.value)}
            disabled={isLoading}
            className="bg-white/80 text-black"
          />
        </div>

        <div className="flex w-full items-center justify-center">
          <Button
            className="w-full max-w-xs h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white shadow-lg shadow-orange-500/25 transition-all"
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

      <MediaLibraryPicker
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        accept="all"
        onSelect={onLibrarySelect}
      />
    </Card>
  );
}
