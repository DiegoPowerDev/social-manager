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
import { ImagePlus, Video, X, Loader2, FolderOpen } from "lucide-react";
import { AICaptionGenerator } from "@/components/social/AICaptionGenerator";
import { AIImageGenerator } from "@/components/social/AIImageGenerator";
import { MediaLibraryPicker } from "@/components/social/MediaLibraryPicker";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/useAuthStore";
import { saveMediaToLibrary } from "@/lib/media";

type IgMediaType = "FEED" | "REELS" | "STORIES" | "CAROUSEL";

interface Props {
  username: string;
  loading?: boolean;
  caption: string;
  onCaptionChange: (value: string) => void;
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  imageUrls: string[];
  onImageUrlsChange: (urls: string[]) => void;
  videoUrl: string | null;
  onVideoChange: (url: string | null) => void;
  mediaType: IgMediaType;
  onMediaTypeChange: (value: IgMediaType) => void;
  onPublish: () => Promise<void>;
}

export function InstagramComposer({
  username,
  loading = false,
  caption,
  onCaptionChange,
  imageUrl,
  onImageChange,
  imageUrls,
  onImageUrlsChange,
  videoUrl,
  onVideoChange,
  mediaType,
  onMediaTypeChange,
  onPublish,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const companyId = useAuthStore((s) => s.companyId);
  const user = useAuthStore((s) => s.user);

  const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
  const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

  const libraryAccept =
    mediaType === "REELS"
      ? "video"
      : mediaType === "CAROUSEL"
        ? "image"
        : "all";

  const uploadToR2 = async (file: File) => {
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
    if (mediaType === "REELS" && item.type !== "video") {
      setMediaError("Los Reels requieren un video");
      return;
    }
    if (mediaType === "CAROUSEL" && item.type !== "image") {
      setMediaError("El carrusel solo admite imágenes");
      return;
    }
    if (item.type === "video") {
      onImageChange(null);
      onImageUrlsChange([]);
      onVideoChange(item.url);
      return;
    }
    onVideoChange(null);
    if (mediaType === "CAROUSEL") {
      if (imageUrls.length >= 10) {
        setMediaError("Máximo 10 imágenes");
        return;
      }
      const next = [...imageUrls, item.url];
      onImageUrlsChange(next);
      onImageChange(next[0]);
    } else {
      onImageUrlsChange([]);
      onImageChange(item.url);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setMediaError(null);

    if (mediaType === "CAROUSEL") {
      const list = Array.from(files);
      if (imageUrls.length + list.length > 10) {
        setMediaError("Máximo 10 imágenes en el carrusel");
        if (imageInputRef.current) imageInputRef.current.value = "";
        return;
      }
      try {
        setUploading(true);
        onVideoChange(null);
        const uploaded: string[] = [];
        for (const f of list) {
          if (f.size > MAX_IMAGE_SIZE) {
            setMediaError(`"${f.name}" supera 8MB`);
            continue;
          }
          uploaded.push(await uploadToR2(f));
        }
        if (uploaded.length === 0) return;
        const next = [...imageUrls, ...uploaded].slice(0, 10);
        onImageUrlsChange(next);
        onImageChange(next[0] || null);
      } catch (err: any) {
        setMediaError(err.message || "Error al subir");
      } finally {
        setUploading(false);
        if (imageInputRef.current) imageInputRef.current.value = "";
      }
      return;
    }

    const file = files[0];
    if (file.size > MAX_IMAGE_SIZE) {
      setMediaError("La imagen es demasiado grande (máximo 8MB)");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    try {
      setUploading(true);
      onVideoChange(null);
      onImageUrlsChange([]);
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
      onImageUrlsChange([]);
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
    onImageUrlsChange([]);
    onVideoChange(null);
    setMediaError(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    setMediaError(null);
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
    if (mediaType === "CAROUSEL" && imageUrls.length < 2) {
      setMediaError("El carrusel necesita al menos 2 imágenes");
      return;
    }
    await onPublish();
  };

  const isLoading = loading || uploading;

  return (
    <Card className="bg-zinc-950/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Nueva publicación</CardTitle>
            <CardDescription className="text-white/60">
              @{username} · Instagram
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-white">Tipo de publicación</Label>
          <Select
            value={mediaType}
            onValueChange={(value) => onMediaTypeChange(value as IgMediaType)}
            disabled={isLoading}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FEED">Publicación (Feed)</SelectItem>
              <SelectItem value="CAROUSEL">
                Carrusel (varias imágenes)
              </SelectItem>
              <SelectItem value="REELS">Reel</SelectItem>
              <SelectItem value="STORIES">Historia</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-white/60">
            {mediaType === "REELS" &&
              "Los Reels requieren un video vertical (recomendado 9:16)"}
            {mediaType === "STORIES" &&
              "Las Historias duran 24 horas · Formato vertical recomendado"}
            {mediaType === "FEED" && "Publicación normal en el perfil"}
            {mediaType === "CAROUSEL" &&
              `Carrusel: ${imageUrls.length}/10 imágenes (mínimo 2)`}
          </p>
        </div>

        {mediaType !== "STORIES" && (
          <div className="flex justify-between gap-2 bg-zinc-950/50 text-white rounded">
            <AICaptionGenerator
              platform="instagram"
              onGenerate={(generated) => onCaptionChange(generated)}
            />
            <Separator orientation="vertical" />
            <div className="flex flex-col w-full gap-2 p-4">
              <span>Caption:</span>
              <Textarea
                placeholder="Escribe un pie de foto..."
                value={caption}
                onChange={(e) => onCaptionChange(e.target.value)}
                rows={4}
                className="resize-none flex-1 bg-white text-black"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 bg-zinc-950/50 text-white rounded">
          <AIImageGenerator
            onGenerate={(url) => {
              if (mediaType === "REELS") return;
              onVideoChange(null);
              if (mediaType === "CAROUSEL") {
                if (imageUrls.length >= 10) {
                  setMediaError("Máximo 10 imágenes");
                  return;
                }
                const next = [...imageUrls, url];
                onImageUrlsChange(next);
                onImageChange(next[0]);
              } else {
                onImageUrlsChange([]);
                onImageChange(url);
              }
            }}
          />
          <Separator orientation="vertical" />
          <div className="flex w-full flex-col gap-2 p-4">
            <span>Media para publicar:</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <input
                type="file"
                accept="image/*"
                multiple={mediaType === "CAROUSEL"}
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
                disabled={isLoading || mediaType === "CAROUSEL"}
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                className="text-black"
                disabled={
                  isLoading ||
                  mediaType === "REELS" ||
                  (!!videoUrl && mediaType !== "CAROUSEL")
                }
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                {mediaType === "CAROUSEL" ? "Añadir imágenes" : "Imagen"}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-black"
                onClick={() => videoInputRef.current?.click()}
                disabled={
                  isLoading ||
                  mediaType === "CAROUSEL" ||
                  !!imageUrl ||
                  imageUrls.length > 0
                }
              >
                <Video className="h-4 w-4 mr-2" />
                Video {mediaType === "REELS" ? "/ Reel" : ""}
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

              {(imageUrl || videoUrl || imageUrls.length > 0) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeMedia}
                  disabled={isLoading}
                  className="text-red-400"
                >
                  Quitar todo
                </Button>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center min-h-[80px]">
              {mediaType === "CAROUSEL" && imageUrls.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto py-2 w-full">
                  {imageUrls.map((url, i) => (
                    <div
                      key={`${url}-${i}`}
                      className="relative shrink-0 w-24 h-24 rounded border overflow-hidden bg-muted"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="absolute top-0.5 right-0.5 h-6 w-6"
                        onClick={() => {
                          const next = imageUrls.filter((_, j) => j !== i);
                          onImageUrlsChange(next);
                          onImageChange(next[0] || null);
                        }}
                        disabled={isLoading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                (imageUrl || videoUrl) && (
                  <div className="relative rounded-lg overflow-hidden border bg-muted/30 w-full max-w-md">
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
                )
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
              (mediaType === "CAROUSEL" && imageUrls.length < 2) ||
              (mediaType === "REELS" && !videoUrl) ||
              (mediaType === "FEED" && !imageUrl && !videoUrl) ||
              (mediaType === "STORIES" && !imageUrl && !videoUrl)
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploading ? "Subiendo..." : "Publicando..."}
              </>
            ) : mediaType === "CAROUSEL" ? (
              "Publicar carrusel"
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
        accept={libraryAccept}
        onSelect={onLibrarySelect}
      />
    </Card>
  );
}
