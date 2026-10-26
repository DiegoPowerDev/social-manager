"use client";

import { useEffect, useRef, useState } from "react";
import { doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { FolderOpen, Pencil } from "lucide-react";
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
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";

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
  canEdit?: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function ScheduledPostDetailModal({
  post,
  open,
  canEdit: canEditProp,
  onClose,
  onUpdated,
}: Props) {
  const [editing, setEditing] = useState(false);

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const companyId = useAuthStore((s) => s.companyId);
  const memberRole = useAuthStore((s) => s.memberRole);

  const roleCanEdit = memberRole === "admin" || memberRole === "editor";
  const allowedByProp = canEditProp !== undefined ? canEditProp : roleCanEdit;
  const canEditContent = !!post && post.status === "scheduled" && allowedByProp;

  /** Campos bloqueados salvo en modo edición */
  const locked = !editing || !canEditContent;

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const isCarousel = selectedInstagram && instagramMediaType === "CAROUSEL";

  const loadFromPost = (p: ScheduledPost) => {
    setTitle(p.title || "");
    setMessage(p.message || "");
    setImageUrl(p.imageUrl || p.imageUrls?.[0] || null);
    setImageUrls(p.imageUrls || []);
    setVideoUrl(p.videoUrl || null);
    setLink(p.link || "");
    setSelectedFacebook(!!p.platforms?.facebook);
    setSelectedInstagram(!!p.platforms?.instagram);
    setSelectedLinkedIn(!!p.platforms?.linkedin);
    setSelectedYouTube(!!p.platforms?.youtube);
    setSelectedTikTok(!!p.platforms?.tiktok);
    setInstagramMediaType((p.instagramMediaType as IgMediaType) || "FEED");
    setYoutubeTitle(p.youtubeTitle || "");
    setYoutubePrivacy(p.youtubePrivacy || "public");
    setDateStr(format(p.scheduledAt, "yyyy-MM-dd"));
    setTime(format(p.scheduledAt, "HH:mm"));
  };

  useEffect(() => {
    if (!post || !open) return;
    loadFromPost(post);
    setEditing(false); // siempre empieza en solo lectura
  }, [post, open]);

  const uploadToR2 = async (file: File) => {
    if (!companyId) throw new Error("No hay empresa asociada");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "scheduled");
    formData.append("companyId", companyId);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
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
    if (locked) return;
    if (item.type === "video") {
      setImageUrl(null);
      setImageUrls([]);
      setVideoUrl(item.url);
      toast.success("Video desde biblioteca");
      return;
    }
    setVideoUrl(null);
    if (isCarousel) {
      if (imageUrls.length >= 10) {
        toast.error("Máximo 10 imágenes");
        return;
      }
      const next = [...imageUrls, item.url];
      setImageUrls(next);
      setImageUrl(next[0]);
    } else {
      setImageUrls([]);
      setImageUrl(item.url);
    }
    toast.success("Imagen desde biblioteca");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || locked) return;
    const tid = toast.loading(
      isCarousel ? "Subiendo imágenes…" : "Subiendo imagen…",
    );
    try {
      setUploadingMedia(true);
      setVideoUrl(null);
      if (isCarousel) {
        const list = Array.from(files);
        if (imageUrls.length + list.length > 10) {
          toast.error("Máximo 10 imágenes", { id: tid });
          return;
        }
        const uploaded: string[] = [];
        for (const f of list) uploaded.push(await uploadToR2(f));
        const next = [...imageUrls, ...uploaded].slice(0, 10);
        setImageUrls(next);
        setImageUrl(next[0] || null);
        toast.success("Imágenes listas", { id: tid });
      } else {
        setImageUrls([]);
        setImageUrl(await uploadToR2(files[0]));
        toast.success("Imagen lista", { id: tid });
      }
    } catch (err: any) {
      toast.error(err.message || "Error al subir", { id: tid });
    } finally {
      setUploadingMedia(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || locked) return;
    const tid = toast.loading("Subiendo video…");
    try {
      setUploadingMedia(true);
      setImageUrl(null);
      setImageUrls([]);
      setVideoUrl(await uploadToR2(file));
      toast.success("Video listo", { id: tid });
    } catch (err: any) {
      toast.error(err.message || "Error al subir", { id: tid });
    } finally {
      setUploadingMedia(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const clearMedia = () => {
    if (locked) return;
    setImageUrl(null);
    setImageUrls([]);
    setVideoUrl(null);
  };

  const handleSave = async () => {
    if (!post || !canEditContent || !editing) return;

    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    if (
      !selectedFacebook &&
      !selectedInstagram &&
      !selectedLinkedIn &&
      !selectedYouTube &&
      !selectedTikTok
    ) {
      toast.error("Selecciona al menos una red");
      return;
    }
    if (selectedInstagram) {
      if (instagramMediaType === "CAROUSEL" && imageUrls.length < 2) {
        toast.error("El carrusel necesita al menos 2 imágenes");
        return;
      }
      if (instagramMediaType === "REELS" && !videoUrl) {
        toast.error("Los Reels requieren un video");
        return;
      }
      if (
        instagramMediaType !== "CAROUSEL" &&
        instagramMediaType !== "REELS" &&
        !imageUrl &&
        !videoUrl
      ) {
        toast.error("Instagram requiere imagen o video");
        return;
      }
    }
    if ((selectedYouTube || selectedTikTok) && !videoUrl) {
      toast.error("YouTube y TikTok requieren un video");
      return;
    }
    if (selectedYouTube && !youtubeTitle.trim() && !message.trim()) {
      toast.error("YouTube requiere un título");
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(dateStr + "T00:00:00");
    scheduledAt.setHours(hours, minutes, 0, 0);
    if (scheduledAt.getTime() < Date.now()) {
      toast.error("La fecha/hora debe ser en el futuro");
      return;
    }

    const tid = toast.loading("Guardando…");
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
      toast.success("Cambios guardados", { id: tid });
      setEditing(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar", { id: tid });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (post) loadFromPost(post);
    setEditing(false);
  };

  const performDelete = async () => {
    if (!post || !canEditContent) return;
    setDeleting(true);
    const tid = toast.loading("Eliminando…");
    try {
      await deleteDoc(doc(db, "scheduledPosts", post.id));
      toast.success("Publicación eliminada", { id: tid });
      setDeleteOpen(false);
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar", { id: tid });
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-zinc-950/60 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/40">
          {/* Header igual estilo SchedulePostModal */}
          <div className="sticky top-0 px-6 py-4 flex items-center bg-black justify-between rounded-t-2xl z-10">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {editing ? "Editar publicación" : "Publicación programada"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge>{statusLabel[post.status] || post.status}</Badge>
                {editing && (
                  <Badge
                    variant="outline"
                    className="text-amber-300 border-amber-400/50"
                  >
                    Editando
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white"
            >
              Cerrar
            </Button>
          </div>

          {!canEditContent && (
            <p className="mx-6 mt-3 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-md p-2">
              {post.status !== "scheduled"
                ? `Este post ya no se puede editar (${statusLabel[post.status] || post.status}).`
                : "Solo lectura. No puedes modificar ni eliminar."}
            </p>
          )}

          <div className="p-6 space-y-5">
            {/* Título + fecha + hora */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Título</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={locked || saving}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Fecha</Label>
                <Input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  disabled={locked || saving}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Hora</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={locked || saving}
                  className="bg-white"
                />
              </div>
            </div>

            {/* Redes */}
            <div className="space-y-3">
              <Label className="text-white">Redes</Label>
              <div className="flex gap-2 flex-wrap justify-center">
                {(
                  [
                    ["fb", "Facebook", selectedFacebook, setSelectedFacebook],
                    [
                      "ig",
                      "Instagram",
                      selectedInstagram,
                      setSelectedInstagram,
                    ],
                    ["li", "LinkedIn", selectedLinkedIn, setSelectedLinkedIn],
                    ["yt", "YouTube", selectedYouTube, setSelectedYouTube],
                    ["tt", "TikTok", selectedTikTok, setSelectedTikTok],
                  ] as const
                ).map(([key, label, checked, set]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-3 bg-white/60 rounded-lg flex-wrap"
                  >
                    <Checkbox
                      id={`detail-${key}`}
                      checked={checked}
                      onCheckedChange={(c) => {
                        if (locked) return;
                        set(c === true);
                        if (key === "ig" && !c) setImageUrls([]);
                      }}
                      disabled={locked || saving}
                    />
                    <Label htmlFor={`detail-${key}`}>{label}</Label>
                    {key === "ig" && selectedInstagram && !locked && (
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
                    {key === "ig" && selectedInstagram && locked && (
                      <Badge variant="outline" className="text-xs">
                        {instagramMediaType}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedYouTube && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-white">Título YouTube</Label>
                  <Input
                    value={youtubeTitle}
                    onChange={(e) => setYoutubeTitle(e.target.value)}
                    className="bg-white"
                    disabled={locked || saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Privacidad</Label>
                  <Select
                    value={youtubePrivacy}
                    onValueChange={(v) =>
                      setYoutubePrivacy(v as "public" | "unlisted" | "private")
                    }
                    disabled={locked || saving}
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
                disabled={locked || saving}
                className="bg-white"
              />
            </div>

            {/* Media */}
            <div className="space-y-3">
              <Label className="text-white">Media</Label>

              {isCarousel && imageUrls.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto py-2">
                  {imageUrls.map((url, i) => (
                    <div
                      key={`${url}-${i}`}
                      className="relative shrink-0 w-24 h-24 rounded border overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {!locked && (
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
                      // eslint-disable-next-line @next/next/no-img-element
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
                    {!locked && (
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

              {!locked && (
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
              <Label className="text-white">Enlace (Facebook)</Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                disabled={locked || saving}
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

            {/* Acciones: lectura → Editar + Eliminar | edición → Cancelar + Guardar */}
            <div className="flex items-center justify-between gap-2 pt-4 border-t border-white/40">
              {canEditContent ? (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                  disabled={saving || deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                {!editing ? (
                  <>
                    <Button variant="outline" onClick={onClose}>
                      Cerrar
                    </Button>
                    {canEditContent && (
                      <Button
                        onClick={() => setEditing(true)}
                        className="bg-gradient-to-r from-orange-400 to-yellow-500 text-white"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
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
                  </>
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

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Eliminar publicación programada?"
        description="Esta acción no se puede deshacer. El post dejará de publicarse en la hora prevista."
        confirmLabel="Eliminar"
        destructive
        loading={deleting}
        onConfirm={performDelete}
      />
    </>
  );
}
