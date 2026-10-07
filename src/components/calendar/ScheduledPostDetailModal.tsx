"use client";

import { useEffect, useRef, useState } from "react";
import { doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
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
import { es } from "date-fns/locale";

interface ScheduledPost {
  id: string;
  title: string;
  message?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  link?: string | null;
  platforms: {
    facebook?: boolean;
    instagram?: boolean;
    linkedin?: boolean;
  };
  instagramMediaType?: "FEED" | "REELS" | "STORIES" | null;
  scheduledAt: Date;
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
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [selectedFacebook, setSelectedFacebook] = useState(false);
  const [selectedInstagram, setSelectedInstagram] = useState(false);
  const [selectedLinkedIn, setSelectedLinkedIn] = useState(false);
  const [instagramMediaType, setInstagramMediaType] = useState<
    "FEED" | "REELS" | "STORIES"
  >("FEED");
  const [dateStr, setDateStr] = useState("");
  const [time, setTime] = useState("10:00");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const canEdit = post?.status === "scheduled";

  useEffect(() => {
    if (!post || !open) return;

    setTitle(post.title || "");
    setMessage(post.message || "");
    setImageUrl(post.imageUrl || null);
    setVideoUrl(post.videoUrl || null);
    setLink(post.link || "");
    setSelectedFacebook(!!post.platforms?.facebook);
    setSelectedInstagram(!!post.platforms?.instagram);
    setSelectedLinkedIn(!!post.platforms?.linkedin);
    setInstagramMediaType(post.instagramMediaType || "FEED");
    setDateStr(format(post.scheduledAt, "yyyy-MM-dd"));
    setTime(format(post.scheduledAt, "HH:mm"));
    setError(null);
  }, [post, open]);

  const uploadToR2 = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "scheduled");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al subir");
    }
    const data = await res.json();
    return data.publicUrl as string;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingMedia(true);
      setVideoUrl(null);
      const url = await uploadToR2(file);
      setImageUrl(url);
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
      const url = await uploadToR2(file);
      setVideoUrl(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingMedia(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!post || !canEdit) return;
    setError(null);

    if (!title.trim()) {
      setError("El título es obligatorio");
      return;
    }
    if (!selectedFacebook && !selectedInstagram && !selectedLinkedIn) {
      setError("Selecciona al menos una red");
      return;
    }
    if (selectedInstagram && !imageUrl && !videoUrl) {
      setError("Instagram requiere imagen o video");
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
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        link: link.trim() || null,
        platforms: {
          facebook: selectedFacebook,
          instagram: selectedInstagram,
          linkedin: selectedLinkedIn,
        },
        instagramMediaType: selectedInstagram ? instagramMediaType : null,
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
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {canEdit ? "Editar publicación" : "Detalle de publicación"}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  post.status === "published"
                    ? "default"
                    : post.status === "failed"
                      ? "destructive"
                      : "secondary"
                }
              >
                {statusLabel[post.status] || post.status}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Título */}
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEdit || saving}
              maxLength={80}
            />
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                disabled={!canEdit || saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={!canEdit || saving}
              />
            </div>
          </div>

          {/* Texto */}
          <div className="space-y-2">
            <Label>Texto / Caption</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              disabled={!canEdit || saving}
            />
          </div>

          {/* Media */}
          <div className="space-y-3">
            <Label>Media</Label>
            {(imageUrl || videoUrl) && (
              <div className="relative rounded-lg overflow-hidden border bg-muted/30">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full max-h-48 object-contain"
                  />
                )}
                {videoUrl && (
                  <video src={videoUrl} controls className="w-full max-h-48" />
                )}
                {canEdit && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={() => {
                      setImageUrl(null);
                      setVideoUrl(null);
                    }}
                    disabled={saving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {canEdit && !imageUrl && !videoUrl && (
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
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
                  disabled={saving || uploadingMedia}
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Imagen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={saving || uploadingMedia}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </Button>
              </div>
            )}
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label>Enlace (Facebook)</Label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={!canEdit || saving}
            />
          </div>

          {/* Redes */}
          <div className="space-y-3">
            <Label>Redes</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="edit-fb"
                  checked={selectedFacebook}
                  onCheckedChange={(c) => setSelectedFacebook(c === true)}
                  disabled={!canEdit || saving}
                />
                <Label htmlFor="edit-fb">Facebook</Label>
              </div>
              <div className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="edit-ig"
                    checked={selectedInstagram}
                    onCheckedChange={(c) => setSelectedInstagram(c === true)}
                    disabled={!canEdit || saving}
                  />
                  <Label htmlFor="edit-ig">Instagram</Label>
                </div>
                {selectedInstagram && canEdit && (
                  <div className="ml-7">
                    <Select
                      value={instagramMediaType}
                      onValueChange={(v) => setInstagramMediaType(v as any)}
                      disabled={saving}
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FEED">Feed</SelectItem>
                        <SelectItem value="REELS">Reel</SelectItem>
                        <SelectItem value="STORIES">Historia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="edit-li"
                  checked={selectedLinkedIn}
                  onCheckedChange={(c) => setSelectedLinkedIn(c === true)}
                  disabled={!canEdit || saving}
                />
                <Label htmlFor="edit-li">LinkedIn</Label>
              </div>
            </div>
          </div>

          {/* Resultados si ya se publicó */}
          {post.results && Object.keys(post.results).length > 0 && (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <Label>Resultados de publicación</Label>
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

          {/* Acciones */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
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
              {canEdit && (
                <Button
                  onClick={handleSave}
                  disabled={saving || uploadingMedia}
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
    </div>
  );
}
