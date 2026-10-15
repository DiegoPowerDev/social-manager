"use client";

import { useEffect, useRef, useState } from "react";
import { doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { FolderOpen } from "lucide-react";
import { MediaLibraryPicker } from "@/components/social/MediaLibraryPicker";
import { saveMediaToLibrary } from "@/lib/media";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ImagePlus, Video, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "@/stores/useAuthStore";

type IgMediaType = "FEED" | "REELS" | "STORIES" | "CAROUSEL";

interface ScheduledPost {
  id: string;
  title: string;
  message?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  videoUrl?: string | null;
  link?: string | null;
  platforms: {
    facebook?: boolean;
    instagram?: boolean;
    linkedin?: boolean;
    youtube?: boolean;
    tiktok?: boolean;
  };
  instagramMediaType?: IgMediaType | null;
  scheduledAt: Date;
  youtubeTitle?: string | null;
  youtubePrivacy?: "public" | "unlisted" | "private" | null;
  status: "scheduled" | "publishing" | "published" | "failed";
  results?: Record<string, { success: boolean; message?: string }>;
}

interface Props {
  post: ScheduledPost | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function ScheduledPostDetailModal({
  post,
  open,
  onClose,
  onUpdated,
}: Props) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [selectedFacebook, setSelectedFacebook] = useState(false);
  const [selectedInstagram, setSelectedInstagram] = useState(false);
  const [selectedLinkedIn, setSelectedLinkedIn] = useState(false);
  const [selectedYouTube, setSelectedYouTube] = useState(false);
  const [selectedTikTok, setSelectedTikTok] = useState(false);
  const [instagramMediaType, setInstagramMediaType] =
    useState<IgMediaType>("FEED");
  const [dateStr, setDateStr] = useState("");
  const [time, setTime] = useState("10:00");
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubePrivacy, setYoutubePrivacy] = useState<
    "public" | "unlisted" | "private"
  >("public");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const companyId = useAuthStore((s) => s.companyId);
  const memberRole = useAuthStore((s) => s.memberRole);
  const canEditContent =
    post?.status === "scheduled" &&
    (memberRole === "admin" || memberRole === "editor");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isCarousel = selectedInstagram && instagramMediaType === "CAROUSEL";

  useEffect(() => {
    if (!post || !open) return;

    setTitle(post.title || "");
    setMessage(post.message || "");
    setImageUrl(post.imageUrl || post.imageUrls?.[0] || null);
    setImageUrls(post.imageUrls || []);
    setVideoUrl(post.videoUrl || null);
    setLink(post.link || "");
    setSelectedFacebook(!!post.platforms?.facebook);
    setSelectedInstagram(!!post.platforms?.instagram);
    setSelectedLinkedIn(!!post.platforms?.linkedin);
    setSelectedYouTube(!!post.platforms?.youtube);
    setSelectedTikTok(!!post.platforms?.tiktok);
    setInstagramMediaType((post.instagramMediaType as IgMediaType) || "FEED");
    setYoutubeTitle(post.youtubeTitle || "");
    setYoutubePrivacy(post.youtubePrivacy || "public");
    setDateStr(format(post.scheduledAt, "yyyy-MM-dd"));
    setTime(format(post.scheduledAt, "HH:mm"));
    setError(null);
  }, [post, open]);

  const uploadToR2 = async (file: File) => {
    if (!companyId) throw new Error("No hay empresa asociada");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "scheduled");
    formData.append("companyId", companyId);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al subir");
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
        console.warn(e);
      }
    }
    return publicUrl;
  };

  const onLibrarySelect = (item: { url: string; type: "image" | "video" }) => {
    setError(null);
    if (item.type === "video") {
      setImageUrl(null);
      setImageUrls([]);
      setVideoUrl(item.url);
      return;
    }
    setVideoUrl(null);
    if (isCarousel) {
      if (imageUrls.length >= 10) {
        setError("Máximo 10 imágenes");
        return;
      }
      const next = [...imageUrls, item.url];
      setImageUrls(next);
      setImageUrl(next[0]);
    } else {
      setImageUrls([]);
      setImageUrl(item.url);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      setUploadingMedia(true);
      setVideoUrl(null);
      if (isCarousel) {
        const list = Array.from(files);
        if (imageUrls.length + list.length > 10) {
          setError("Máximo 10 imágenes");
          return;
        }
        const uploaded: string[] = [];
        for (const f of list) {
          uploaded.push(await uploadToR2(f));
        }
        const next = [...imageUrls, ...uploaded].slice(0, 10);
        setImageUrls(next);
        setImageUrl(next[0] || null);
      } else {
        setImageUrls([]);
        setImageUrl(await uploadToR2(files[0]));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingMedia(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingMedia(true);
      setImageUrl(null);
      setImageUrls([]);
      setVideoUrl(await uploadToR2(file));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingMedia(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const clearMedia = () => {
    setImageUrl(null);
    setImageUrls([]);
    setVideoUrl(null);
  };

  const handleSave = async () => {
    if (!post || !canEditContent) return;
    setError(null);

    if (!title.trim()) {
      setError("El título es obligatorio");
      return;
    }
    if (
      !selectedFacebook &&
      !selectedInstagram &&
      !selectedLinkedIn &&
      !selectedYouTube &&
      !selectedTikTok
    ) {
      setError("Selecciona al menos una red");
      return;
    }
    if (selectedInstagram) {
      if (instagramMediaType === "CAROUSEL" && imageUrls.length < 2) {
        setError("El carrusel necesita al menos 2 imágenes");
        return;
      }
      if (instagramMediaType === "REELS" && !videoUrl) {
        setError("Los Reels requieren un video");
        return;
      }
      if (instagramMediaType !== "CAROUSEL" && !imageUrl && !videoUrl) {
        setError("Instagram requiere imagen o video");
        return;
      }
    }
    if ((selectedYouTube || selectedTikTok) && !videoUrl) {
      setError("YouTube y TikTok requieren un video");
      return;
    }
    if (selectedYouTube && !youtubeTitle.trim() && !message.trim()) {
      setError("YouTube requiere un título");
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(dateStr + "T00:00:00");
    scheduledAt.setHours(hours, minutes, 0, 0);
    if (scheduledAt.getTime() < Date.now()) {
      setError("La fecha/hora debe ser en el futuro");
      return;
    }

    try {
      setSaving(true);
      await updateDoc(doc(db, "scheduledPosts", post.id), {
        title: title.trim(),
        message: message.trim() || null,
        imageUrl: isCarousel ? imageUrls[0] || null : imageUrl || null,
        imageUrls: isCarousel ? imageUrls : null,
        videoUrl: videoUrl || null,
        link: link.trim() || null,
        platforms: {
          facebook: selectedFacebook,
          instagram: selectedInstagram,
          linkedin: selectedLinkedIn,
          youtube: selectedYouTube,
          tiktok: selectedTikTok,
        },
        instagramMediaType: selectedInstagram ? instagramMediaType : null,
        youtubeTitle: selectedYouTube
          ? youtubeTitle.trim() || message.slice(0, 100)
          : null,
        youtubePrivacy: selectedYouTube ? youtubePrivacy : null,
        scheduledAt: Timestamp.fromDate(scheduledAt),
        updatedAt: Timestamp.now(),
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm("¿Eliminar esta publicación programada?")) return;
    try {
      setDeleting(true);
      await deleteDoc(doc(db, "scheduledPosts", post.id));
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  if (!open || !post) return null;

  const statusLabel: Record<string, string> = {
    scheduled: "Programado",
    publishing: "Publicando...",
    published: "Publicado",
    failed: "Falló",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-zinc-950/60 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/40">
        <div className="sticky top-0 px-6 py-4 flex items-center bg-black justify-between rounded-t-2xl">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {canEditContent ? "Editar publicación" : "Detalle"}
            </h3>
            <Badge className="mt-1">
              {statusLabel[post.status] || post.status}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEditContent || saving}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Fecha</Label>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                disabled={!canEditContent || saving}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Hora</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={!canEditContent || saving}
                className="bg-white"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-white">Redes</Label>
            <div className="flex gap-2 flex-wrap justify-center">
              <div className="flex items-center gap-2 p-3 bg-white/60 rounded-lg">
                <Checkbox
                  id="edit-fb"
                  checked={selectedFacebook}
                  onCheckedChange={(c) => setSelectedFacebook(c === true)}
                  disabled={!canEditContent || saving}
                />
                <Label htmlFor="edit-fb">Facebook</Label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white/60 rounded-lg flex-wrap">
                <Checkbox
                  id="edit-ig"
                  checked={selectedInstagram}
                  onCheckedChange={(c) => {
                    setSelectedInstagram(c === true);
                    if (!c) setImageUrls([]);
                  }}
                  disabled={!canEditContent || saving}
                />
                <Label htmlFor="edit-ig">Instagram</Label>
                {selectedInstagram && canEditContent && (
                  <Select
                    value={instagramMediaType}
                    onValueChange={(v) => {
                      const t = v as IgMediaType;
                      setInstagramMediaType(t);
                      if (t !== "CAROUSEL") setImageUrls([]);
                      if (t === "CAROUSEL") setVideoUrl(null);
                      if (t === "REELS") {
                        setImageUrl(null);
                        setImageUrls([]);
                      }
                    }}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-8 w-32 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FEED">Feed</SelectItem>
                      <SelectItem value="CAROUSEL">Carrusel</SelectItem>
                      <SelectItem value="REELS">Reel</SelectItem>
                      <SelectItem value="STORIES">Historia</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-center gap-2 p-3 bg-white/60 rounded-lg">
                <Checkbox
                  id="edit-li"
                  checked={selectedLinkedIn}
                  onCheckedChange={(c) => setSelectedLinkedIn(c === true)}
                  disabled={!canEditContent || saving}
                />
                <Label htmlFor="edit-li">LinkedIn</Label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white/60 rounded-lg">
                <Checkbox
                  id="edit-yt"
                  checked={selectedYouTube}
                  onCheckedChange={(c) => setSelectedYouTube(c === true)}
                  disabled={!canEditContent || saving}
                />
                <Label htmlFor="edit-yt">YouTube</Label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white/60 rounded-lg">
                <Checkbox
                  id="edit-tt"
                  checked={selectedTikTok}
                  onCheckedChange={(c) => setSelectedTikTok(c === true)}
                  disabled={!canEditContent || saving}
                />
                <Label htmlFor="edit-tt">TikTok</Label>
              </div>
            </div>
          </div>

          {selectedYouTube && canEditContent && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white">Título YouTube</Label>
                <Input
                  value={youtubeTitle}
                  onChange={(e) => setYoutubeTitle(e.target.value)}
                  className="bg-white"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Privacidad</Label>
                <Select
                  value={youtubePrivacy}
                  onValueChange={(v) => setYoutubePrivacy(v as any)}
                  disabled={saving}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Público</SelectItem>
                    <SelectItem value="unlisted">No listado</SelectItem>
                    <SelectItem value="private">Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {isCarousel && (
            <p className="text-xs text-amber-200">
              Carrusel: {imageUrls.length}/10 (mín. 2)
            </p>
          )}

          <div className="space-y-2">
            <Label className="text-white">Texto / Caption</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              disabled={!canEditContent || saving}
              className="bg-white"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-white">Media</Label>

            {isCarousel && imageUrls.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto py-2">
                {imageUrls.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="relative shrink-0 w-24 h-24 rounded border overflow-hidden"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {canEditContent && (
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="absolute top-0.5 right-0.5 h-6 w-6"
                        onClick={() => {
                          const next = imageUrls.filter((_, j) => j !== i);
                          setImageUrls(next);
                          setImageUrl(next[0] || null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              (imageUrl || videoUrl) && (
                <div className="relative rounded-lg overflow-hidden border bg-black">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt=""
                      className="w-full max-h-48 object-contain"
                    />
                  )}
                  {videoUrl && (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full max-h-48"
                    />
                  )}
                  {canEditContent && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={clearMedia}
                      disabled={saving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            )}

            {canEditContent && (
              <div className="flex gap-2 flex-wrap">
                <input
                  type="file"
                  accept="image/*"
                  multiple={isCarousel}
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <input
                  type="file"
                  accept="video/*"
                  ref={videoInputRef}
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={
                    saving || uploadingMedia || (!!videoUrl && !isCarousel)
                  }
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  {isCarousel ? "Añadir imágenes" : "Imagen"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={
                    saving ||
                    uploadingMedia ||
                    isCarousel ||
                    !!imageUrl ||
                    imageUrls.length > 0
                  }
                >
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setLibraryOpen(true)}
                  disabled={saving || uploadingMedia}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Biblioteca
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Enlace (Facebook)</Label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={!canEditContent || saving}
              className="bg-white"
            />
          </div>

          {post.results && Object.keys(post.results).length > 0 && (
            <div className="space-y-2 p-3 bg-white/60 rounded-lg">
              <Label>Resultados</Label>
              {Object.entries(post.results).map(([platform, result]) => (
                <p key={platform} className="text-sm">
                  <span className="font-medium capitalize">{platform}: </span>
                  <span
                    className={
                      result.success ? "text-green-600" : "text-red-600"
                    }
                  >
                    {result.success ? "OK" : result.message || "Error"}
                  </span>
                </p>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-between gap-2 pt-4 border-t border-white/40">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving || deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cerrar
              </Button>
              {canEditContent && (
                <Button
                  onClick={handleSave}
                  disabled={saving || uploadingMedia}
                  className="bg-gradient-to-r from-orange-400 to-yellow-500 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <MediaLibraryPicker
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        accept={
          selectedYouTube ||
          selectedTikTok ||
          (selectedInstagram && instagramMediaType === "REELS")
            ? "video"
            : isCarousel
              ? "image"
              : "all"
        }
        onSelect={onLibrarySelect}
      />
    </div>
  );
}
