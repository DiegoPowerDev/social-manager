"use client";

import { useEffect, useRef, useState } from "react";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      try {
        setLoadingAccounts(true);
        const snapshot = await getDocs(collection(db, "socialAccounts"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SocialAccount[];
        setAccounts(data);

        if (data.find((a) => a.platform === "facebook"))
          setSelectedFacebook(true);
        if (data.find((a) => a.platform === "instagram"))
          setSelectedInstagram(true);
        if (data.find((a) => a.platform === "linkedin"))
          setSelectedLinkedIn(true);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAccounts(false);
      }
    };

    load();
  }, [open]);

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
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
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
          {/* Título */}
          <div className="space-y-2">
            <Label>Título (solo para el calendario)</Label>
            <Input
              placeholder="Ej: Post de Halloween"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              disabled={saving}
            />
          </div>

          {/* Hora */}
          <div className="space-y-2">
            <Label>Hora de publicación</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={saving}
              className="w-40"
            />
            <p className="text-xs text-muted-foreground">
              Zona horaria de tu navegador
            </p>
          </div>

          {/* IA */}
          <AICaptionGenerator
            platform="general"
            onGenerate={(caption) => setMessage(caption)}
          />
          <AIImageGenerator
            onGenerate={(url) => {
              setImageUrl(url);
              setVideoUrl(null);
            }}
          />

          {/* Texto */}
          <div className="space-y-2">
            <Label>Texto / Caption</Label>
            <Textarea
              placeholder="Contenido de la publicación..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              disabled={saving}
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

            {!imageUrl && !videoUrl && (
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
            {uploadingMedia && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Subiendo...
              </p>
            )}
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label>Enlace (solo Facebook)</Label>
            <Input
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={saving}
            />
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
                {facebookAccount && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      id="fb"
                      checked={selectedFacebook}
                      onCheckedChange={(c) => setSelectedFacebook(c === true)}
                      disabled={saving}
                    />
                    <Label htmlFor="fb" className="cursor-pointer">
                      Facebook · {facebookAccount.name}
                    </Label>
                  </div>
                )}

                {instagramAccount && (
                  <div className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="ig"
                        checked={selectedInstagram}
                        onCheckedChange={(c) =>
                          setSelectedInstagram(c === true)
                        }
                        disabled={saving}
                      />
                      <Label htmlFor="ig" className="cursor-pointer">
                        Instagram · @{instagramAccount.username}
                      </Label>
                    </div>
                    {selectedInstagram && (
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
                )}

                {linkedinAccount && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      id="li"
                      checked={selectedLinkedIn}
                      onCheckedChange={(c) => setSelectedLinkedIn(c === true)}
                      disabled={saving}
                    />
                    <Label htmlFor="li" className="cursor-pointer">
                      LinkedIn · {linkedinAccount.name}
                    </Label>
                  </div>
                )}

                {!facebookAccount && !instagramAccount && !linkedinAccount && (
                  <p className="text-sm text-muted-foreground">
                    No hay cuentas conectadas
                  </p>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || uploadingMedia}>
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
