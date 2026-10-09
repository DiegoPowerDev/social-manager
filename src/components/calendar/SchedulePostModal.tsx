"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
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
import { Loader2, ImagePlus, Video, X } from "lucide-react";
import { AICaptionGenerator } from "@/components/social/AICaptionGenerator";
import { AIImageGenerator } from "@/components/social/AIImageGenerator";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PostPreview } from "../social/PostPreview";
import { useAuthStore } from "@/stores/useAuthStore";

interface SocialAccount {
  id: string;
  platform: "facebook" | "instagram" | "linkedin";
  name?: string;
  username?: string;
}

interface Props {
  date: Date;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SchedulePostModal({ date, open, onClose, onSaved }: Props) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Contenido
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [link, setLink] = useState("");

  // Redes
  const [selectedFacebook, setSelectedFacebook] = useState(false);
  const [selectedInstagram, setSelectedInstagram] = useState(false);
  const [selectedLinkedIn, setSelectedLinkedIn] = useState(false);
  const [instagramMediaType, setInstagramMediaType] = useState<
    "FEED" | "REELS" | "STORIES"
  >("FEED");

  // Hora (timezone del navegador)
  const [time, setTime] = useState("10:00");

  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const companyId = useAuthStore((s) => s.companyId);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !companyId) return;

    const load = async () => {
      try {
        setLoadingAccounts(true);
        const q = query(
          collection(db, "socialAccounts"),
          where("companyId", "==", companyId),
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SocialAccount[];
        setAccounts(data);

        setSelectedFacebook(!!data.find((a) => a.platform === "facebook"));
        setSelectedInstagram(!!data.find((a) => a.platform === "instagram"));
        setSelectedLinkedIn(!!data.find((a) => a.platform === "linkedin"));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAccounts(false);
      }
    };

    load();
  }, [open, companyId]);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setTitle("");
      setMessage("");
      setImageUrl(null);
      setVideoUrl(null);
      setLink("");
      setTime("10:00");
      setError(null);
    }
  }, [open, date]);

  const facebookAccount = accounts.find((a) => a.platform === "facebook");
  const instagramAccount = accounts.find((a) => a.platform === "instagram");
  const linkedinAccount = accounts.find((a) => a.platform === "linkedin");

  const uploadToR2 = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "scheduled");
    if (companyId) formData.append("companyId", companyId);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al subir archivo");
    }

    const data = await res.json();
    return data.publicUrl as string;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen no puede superar 10MB");
      return;
    }
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
    if (file.size > 100 * 1024 * 1024) {
      setError("El video no puede superar 100MB");
      return;
    }
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

  const removeMedia = () => {
    setImageUrl(null);
    setVideoUrl(null);
  };

  const handleSave = async () => {
    setError(null);

    if (!companyId) {
      setError("No hay empresa asociada");
      return;
    }

    if (!title.trim()) {
      setError("Escribe un título para el calendario");
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

    if (selectedInstagram && instagramMediaType === "REELS" && !videoUrl) {
      setError("Los Reels requieren un video");
      return;
    }

    // Construir fecha+hora en timezone local del navegador
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hours, minutes, 0, 0);

    if (scheduledAt.getTime() < Date.now()) {
      setError("La hora debe ser en el futuro");
      return;
    }

    try {
      setSaving(true);

      await addDoc(collection(db, "scheduledPosts"), {
        title: title.trim(),
        message: message.trim() || null,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        link: link.trim() || null,
        companyId: companyId,
        platforms: {
          facebook: selectedFacebook || false,
          instagram: selectedInstagram || false,
          linkedin: selectedLinkedIn || false,
        },
        instagramMediaType: selectedInstagram ? instagramMediaType : null,
        scheduledAt: Timestamp.fromDate(scheduledAt),
        status: "scheduled",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white/90  rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/40">
        {/* Header */}
        <div className="z-10 sticky top-0 bg-white border-b border-white/40 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-lg font-semibold">Programar publicación</h3>
            <p className="text-sm text-muted-foreground">
              {format(date, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Título + Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título (solo para el calendario)</Label>
              <Input
                placeholder="Ej: Post de Halloween"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                disabled={saving}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label>Hora de publicación</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={saving}
                className="w-40 bg-white"
              />
              <p className="text-xs text-muted-foreground">
                Zona horaria de tu navegador
              </p>
            </div>
          </div>
          {/* Redes */}
          <div className="space-y-3">
            <Label>Redes</Label>
            {loadingAccounts ? (
              <p className="text-sm text-muted-foreground">
                Cargando cuentas...
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 justify-center">
                  {facebookAccount && (
                    <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                      <Checkbox
                        id="fb"
                        checked={selectedFacebook}
                        onCheckedChange={(c) => setSelectedFacebook(c === true)}
                        disabled={saving}
                      />
                      <Label htmlFor="fb" className="cursor-pointer">
                        Facebook
                      </Label>
                    </div>
                  )}

                  {instagramAccount && (
                    <div className="space-y-2 p-3 bg-white/60 rounded-lg flex items-center gap-4 justify-center">
                      <div className="flex h-full justify-center items-center m-0 gap-3">
                        <Checkbox
                          id="ig"
                          checked={selectedInstagram}
                          onCheckedChange={(c) =>
                            setSelectedInstagram(c === true)
                          }
                          disabled={saving}
                        />
                        <Label htmlFor="ig" className="cursor-pointer">
                          Instagram
                        </Label>
                      </div>
                      {selectedInstagram && (
                        <div className="">
                          <Select
                            value={instagramMediaType}
                            onValueChange={(v) =>
                              setInstagramMediaType(v as any)
                            }
                            disabled={saving}
                          >
                            <SelectTrigger className="h-8 w-40 bg-white">
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
                  )}

                  {linkedinAccount && (
                    <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                      <Checkbox
                        id="li"
                        checked={selectedLinkedIn}
                        onCheckedChange={(c) => setSelectedLinkedIn(c === true)}
                        disabled={saving}
                      />
                      <Label htmlFor="li" className="cursor-pointer">
                        LinkedIn
                      </Label>
                    </div>
                  )}
                </div>

                {/* Avisos según redes y tipo */}
                <div className="space-y-2 text-xs">
                  {selectedInstagram && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 p-3 space-y-1">
                      <p className="font-medium">
                        Instagram — formato de media
                      </p>
                      {instagramMediaType === "FEED" && (
                        <p>
                          Imagen: ratio entre <strong>4:5</strong> (vertical) y{" "}
                          <strong>1.91:1</strong> (horizontal). Cuadrado 1:1
                          recomendado. Evita imágenes muy panorámicas.
                        </p>
                      )}
                      {instagramMediaType === "REELS" && (
                        <p>
                          Reels: video vertical <strong>9:16</strong> (ej.
                          1080×1920). Máx. ~90 segundos recomendado.
                        </p>
                      )}
                      {instagramMediaType === "STORIES" && (
                        <p>
                          Historias: imagen o video vertical{" "}
                          <strong>9:16</strong>. No se publica caption por la
                          API.
                        </p>
                      )}
                    </div>
                  )}

                  {selectedLinkedIn && (
                    <div className="rounded-md border border-sky-200 bg-sky-50 text-sky-900 p-3">
                      <p className="font-medium">LinkedIn</p>
                      <p>Soporta texto, imagen y video.</p>
                    </div>
                  )}

                  {selectedFacebook && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 text-blue-900 p-3">
                      <p className="font-medium">Facebook</p>
                      <p>
                        Texto, imagen, video y enlace. Más flexible con el
                        formato.
                      </p>
                    </div>
                  )}
                </div>

                {!facebookAccount && !instagramAccount && !linkedinAccount && (
                  <p className="text-sm text-muted-foreground">
                    No hay cuentas conectadas
                  </p>
                )}
              </div>
            )}
          </div>
          {/* Texto + AI Caption */}
          <div className="flex justify-between gap-2 bg-white/60 rounded">
            <AICaptionGenerator
              platform="general"
              onGenerate={(caption) => setMessage(caption)}
            />
            <Separator orientation="vertical" />
            <div className="flex flex-col w-full gap-2 p-4">
              <span>Texto / Caption</span>
              <Textarea
                placeholder="Contenido de la publicación..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none flex-1 bg-white"
                disabled={saving}
              />
            </div>
          </div>

          {/* Media + AI Image */}
          <div className="flex justify-between gap-2 bg-white/60 rounded">
            <AIImageGenerator
              onGenerate={(url) => {
                setImageUrl(url);
                setVideoUrl(null);
              }}
            />
            <Separator orientation="vertical" />
            <div className="flex w-full flex-col gap-2 p-4">
              <span>Media</span>

              <div className="flex items-center justify-center gap-2">
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
                  disabled={saving || uploadingMedia || !!videoUrl}
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Imagen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={saving || uploadingMedia || !!imageUrl}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </Button>
              </div>

              <div className="flex-1 flex items-center justify-center">
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
                      <video
                        src={videoUrl}
                        controls
                        className="w-full max-h-48"
                      />
                    )}
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={removeMedia}
                      disabled={saving || uploadingMedia}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {uploadingMedia && (
                <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subiendo...
                </p>
              )}
            </div>
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label>Enlace (solo Facebook)</Label>
            <Input
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={saving}
              className="bg-white"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <PostPreview
              message={message}
              imageUrl={imageUrl}
              videoUrl={videoUrl}
            />
          </div>
          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-4 border-t border-white/40">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploadingMedia}
              className="bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white shadow-lg shadow-orange-500/25"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Programar"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
