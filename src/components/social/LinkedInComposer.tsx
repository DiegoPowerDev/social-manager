"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
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
import { ImagePlus, Video, X, Loader2, FolderOpen } from "lucide-react";
import { AICaptionGenerator } from "@/components/social/AICaptionGenerator";
import { AIImageGenerator } from "@/components/social/AIImageGenerator";
import { MediaLibraryPicker } from "@/components/social/MediaLibraryPicker";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/useAuthStore";
import { saveMediaToLibrary } from "@/lib/media";
import { PostPreview } from "./PostPreview";

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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const companyId = useAuthStore((s) => s.companyId);
  const user = useAuthStore((s) => s.user);

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
  const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("La imagen es demasiado grande (máximo 10MB)");
      return;
    }

    const tid = toast.loading("Subiendo imagen…");
    try {
      setUploading(true);
      onVideoChange(null);
      const url = await uploadToR2(file);
      onImageChange(url);
      toast.success("Imagen lista", { id: tid });
    } catch (err: any) {
      toast.error(err.message || "Error al subir la imagen", { id: tid });
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Selecciona un video");
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error("El video es demasiado grande (máximo 200MB)");
      return;
    }

    const tid = toast.loading("Subiendo video…");
    try {
      setUploading(true);
      onImageChange(null);
      const url = await uploadToR2(file);
      onVideoChange(url);
      toast.success("Video listo", { id: tid });
    } catch (err: any) {
      toast.error(err.message || "Error al subir el video", { id: tid });
    } finally {
      setUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const removeMedia = () => {
    onImageChange(null);
    onVideoChange(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const onLibrarySelect = (item: { url: string; type: "image" | "video" }) => {
    if (item.type === "video") {
      onImageChange(null);
      onVideoChange(item.url);
    } else {
      onVideoChange(null);
      onImageChange(item.url);
    }
    toast.success("Media añadido desde la biblioteca");
  };

  const handleSubmit = async () => {
    if (!companyId) {
      toast.error("No hay empresa asociada");
      return;
    }
    if (!text.trim() && !imageUrl && !videoUrl) {
      toast.error("Escribe un texto o agrega una imagen/video");
      return;
    }
    await onPublish();
  };

  const isLoading = loading || uploading;
  const characterCount = text.length;
  const isOverLimit = characterCount > 3000;
  const hasMedia = !!(imageUrl || videoUrl);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <Card className="bg-zinc-950/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Nueva publicación</CardTitle>
                <CardDescription className="text-white/60">
                  Publicando como {accountName}
                </CardDescription>
              </div>
              <Badge variant="secondary">LinkedIn</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="flex justify-between gap-2 bg-zinc-950/50 text-white rounded">
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
                  className="resize-none flex-1 bg-white text-black"
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
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    ref={imageInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isLoading}
                  />
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime"
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
                    disabled={isLoading || !!videoUrl}
                  >
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Imagen
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-black"
                    size="sm"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isLoading || !!imageUrl}
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
                  {imageUrl && (
                    <div className="relative rounded-lg overflow-hidden border bg-muted/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                      <video
                        src={videoUrl}
                        controls
                        className="w-full max-h-64"
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
                </div>
                <p className="text-xs text-white/50 text-center">
                  Imagen ≤ 10MB · Video ≤ 200MB (MP4, hasta ~10 min)
                </p>
              </div>
            </div>
          </CardContent>

          <MediaLibraryPicker
            open={libraryOpen}
            onClose={() => setLibraryOpen(false)}
            accept="all"
            onSelect={onLibrarySelect}
          />
        </Card>
      </div>

      <div className="sticky top-6 z-10 self-start flex flex-col gap-4 w-full">
        <PostPreview
          platform="linkedin"
          accountName={accountName}
          message={text}
          imageUrl={imageUrl}
          videoUrl={videoUrl}
        />
        <Button
          className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white shadow-lg shadow-orange-500/25 transition-all"
          onClick={handleSubmit}
          disabled={
            isLoading ||
            isOverLimit ||
            !companyId ||
            (!text.trim() && !hasMedia)
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
    </div>
  );
}
