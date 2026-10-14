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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Video, X, FolderOpen } from "lucide-react";
import { AICaptionGenerator } from "@/components/social/AICaptionGenerator";
import { MediaLibraryPicker } from "@/components/social/MediaLibraryPicker";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/useAuthStore";
import { saveMediaToLibrary } from "@/lib/media";
import { PostPreview } from "./PostPreview";

interface Props {
  channelName: string;
  loading?: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  videoUrl: string | null;
  onVideoChange: (url: string | null) => void;
  privacyStatus: "public" | "unlisted" | "private";
  onPrivacyChange: (value: "public" | "unlisted" | "private") => void;
  onPublish: () => Promise<void>;
}

export function YouTubeComposer({
  channelName,
  loading = false,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  videoUrl,
  onVideoChange,
  privacyStatus,
  onPrivacyChange,
  onPublish,
}: Props) {
  const companyId = useAuthStore((s) => s.companyId);
  const user = useAuthStore((s) => s.user);
  const [uploading, setUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const MAX_VIDEO_SIZE = 256 * 1024 * 1024;

  const uploadToR2 = async (file: File) => {
    if (!companyId) {
      throw new Error(
        "No hay empresa asociada. Recarga la página o vuelve a iniciar sesión.",
      );
    }

    const signRes = await fetch("/api/upload/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        platform: "youtube",
        contentType: file.type || "video/mp4",
        fileName: file.name,
      }),
    });

    if (!signRes.ok) {
      const err = await signRes.json().catch(() => ({}));
      throw new Error(err.error || "Error al preparar la subida");
    }

    const { uploadUrl, publicUrl, key } = await signRes.json();

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "video/mp4",
      },
      body: file,
    });

    if (!putRes.ok) {
      throw new Error("Error al subir el video al almacenamiento");
    }

    if (user?.uid) {
      try {
        await saveMediaToLibrary({
          companyId,
          uid: user.uid,
          url: publicUrl,
          key,
          fileName: file.name,
          size: file.size,
          mimeType: file.type || "video/mp4",
          source: "upload",
        });
      } catch (e) {
        console.warn("No se pudo guardar en biblioteca:", e);
      }
    }

    return publicUrl as string;
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaError(null);

    if (file.size > MAX_VIDEO_SIZE) {
      setMediaError(
        `El video es demasiado grande (máximo ${Math.floor(MAX_VIDEO_SIZE / (1024 * 1024))}MB)`,
      );
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }

    try {
      setUploading(true);
      const url = await uploadToR2(file);
      onVideoChange(url);
    } catch (err: any) {
      setMediaError(err.message || "Error al subir el video");
    } finally {
      setUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const onLibrarySelect = (item: { url: string; type: "image" | "video" }) => {
    setMediaError(null);
    if (item.type !== "video") {
      setMediaError("YouTube solo admite video");
      return;
    }
    onVideoChange(item.url);
  };

  const removeVideo = () => {
    onVideoChange(null);
    setMediaError(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setMediaError("El título es obligatorio");
      return;
    }
    if (!videoUrl) {
      setMediaError("Sube un video");
      return;
    }
    setMediaError(null);
    await onPublish();
  };

  const isLoading = loading || uploading;
  const titleCount = title.length;
  const isTitleOver = titleCount > 100;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <Card className="bg-zinc-950/60 ">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Subir video</CardTitle>
                <CardDescription>Canal: {channelName}</CardDescription>
              </div>
              <Badge variant="secondary">YouTube</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="yt-title">Título (obligatorio)</Label>
              <Input
                id="yt-title"
                placeholder="Título del video"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                maxLength={100}
                disabled={isLoading}
                className="bg-white"
              />
              <p
                className={`text-xs text-right ${
                  isTitleOver ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                {titleCount}/100
              </p>
            </div>

            <div className="flex justify-between gap-2 bg-white/60 rounded">
              <AICaptionGenerator
                platform="general"
                onGenerate={(caption) => onDescriptionChange(caption)}
              />
              <Separator orientation="vertical" />
              <div className="flex flex-col w-full gap-2 p-4">
                <Label htmlFor="yt-desc">Descripción</Label>
                <Textarea
                  id="yt-desc"
                  placeholder="Descripción del video, links, hashtags..."
                  value={description}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  rows={5}
                  className="resize-none flex-1 bg-white"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Visibilidad</Label>
              <Select
                value={privacyStatus}
                onValueChange={(v) =>
                  onPrivacyChange(v as "public" | "unlisted" | "private")
                }
                disabled={isLoading}
              >
                <SelectTrigger className="bg-white max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Público</SelectItem>
                  <SelectItem value="unlisted">No listado</SelectItem>
                  <SelectItem value="private">Privado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 p-4 bg-white/60 rounded">
              <Label>Video</Label>
              <p className="text-xs text-muted-foreground">
                MP4 recomendado. Máx. ~256MB en este flujo. También puedes
                elegir uno de la biblioteca.
              </p>

              <input
                type="file"
                accept="video/*"
                ref={videoInputRef}
                onChange={handleVideoChange}
                className="hidden"
                disabled={isLoading}
              />

              {!videoUrl ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Seleccionar video
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
              ) : (
                <div className="relative rounded-lg overflow-hidden border bg-muted/30">
                  <video src={videoUrl} controls className="w-full max-h-64" />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={removeVideo}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {uploading && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subiendo a almacenamiento...
                </p>
              )}
            </div>

            {mediaError && <p className="text-sm text-red-500">{mediaError}</p>}

            <div className="flex w-full items-center justify-center">
              <Button
                className="w-full max-w-xs h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white shadow-lg shadow-orange-500/25 transition-all"
                onClick={handleSubmit}
                disabled={
                  isLoading ||
                  isTitleOver ||
                  !title.trim() ||
                  !videoUrl ||
                  !companyId
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {uploading ? "Subiendo..." : "Publicando en YouTube..."}
                  </>
                ) : (
                  "Publicar en YouTube"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <PostPreview
          platform="tiktok"
          accountName={channelName}
          message={title}
          videoUrl={videoUrl}
        />
      </div>
      <MediaLibraryPicker
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        accept="video"
        onSelect={onLibrarySelect}
      />
    </div>
  );
}
