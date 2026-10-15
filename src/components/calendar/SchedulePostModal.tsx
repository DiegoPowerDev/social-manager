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
import { Loader2, ImagePlus, Video, X, FolderOpen } from "lucide-react";
import { MediaLibraryPicker } from "@/components/social/MediaLibraryPicker";
import { saveMediaToLibrary } from "@/lib/media";
import { AICaptionGenerator } from "@/components/social/AICaptionGenerator";
import { AIImageGenerator } from "@/components/social/AIImageGenerator";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PostPreview } from "../social/PostPreview";
import { useAuthStore } from "@/stores/useAuthStore";

interface SocialAccount {
  id: string;
  platform: "facebook" | "instagram" | "linkedin" | "youtube" | "tiktok";
  name?: string;
  username?: string;
}

type IgMediaType = "FEED" | "REELS" | "STORIES" | "CAROUSEL";

interface Props {
  date: Date;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SchedulePostModal({ date, open, onClose, onSaved }: Props) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

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
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubePrivacy, setYoutubePrivacy] = useState<
    "public" | "unlisted" | "private"
  >("public");

  const [time, setTime] = useState("10:00");
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const companyId = useAuthStore((s) => s.companyId);
  const user = useAuthStore((s) => s.user);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isCarousel = selectedInstagram && instagramMediaType === "CAROUSEL";

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
        setSelectedYouTube(!!data.find((a) => a.platform === "youtube"));
        setSelectedTikTok(!!data.find((a) => a.platform === "tiktok"));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAccounts(false);
      }
    };
    load();
  }, [open, companyId]);

  useEffect(() => {
    if (open) {
      setTitle("");
      setMessage("");
      setImageUrl(null);
      setImageUrls([]);
      setVideoUrl(null);
      setLink("");
      setTime("10:00");
      setError(null);
      setYoutubeTitle("");
      setYoutubePrivacy("public");
      setInstagramMediaType("FEED");
    }
  }, [open, date]);

  const facebookAccount = accounts.find((a) => a.platform === "facebook");
  const instagramAccount = accounts.find((a) => a.platform === "instagram");
  const linkedinAccount = accounts.find((a) => a.platform === "linkedin");
  const youtubeAccount = accounts.find((a) => a.platform === "youtube");
  const tiktokAccount = accounts.find((a) => a.platform === "tiktok");

  const uploadToR2 = async (file: File) => {
    if (!companyId) throw new Error("No hay empresa asociada");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "scheduled");
    formData.append("companyId", companyId);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al subir archivo");
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
        console.warn("Biblioteca:", e);
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
          if (f.size > 10 * 1024 * 1024) {
            setError(`"${f.name}" supera 10MB`);
            continue;
          }
          uploaded.push(await uploadToR2(f));
        }
        const next = [...imageUrls, ...uploaded].slice(0, 10);
        setImageUrls(next);
        setImageUrl(next[0] || null);
      } else {
        const file = files[0];
        if (file.size > 10 * 1024 * 1024) {
          setError("La imagen no puede superar 10MB");
          return;
        }
        setImageUrls([]);
        setImageUrl(await uploadToR2(file));
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
    if (file.size > 100 * 1024 * 1024) {
      setError("El video no puede superar 100MB");
      return;
    }
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

  const removeMedia = () => {
    setImageUrl(null);
    setImageUrls([]);
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
        imageUrl: isCarousel ? imageUrls[0] || null : imageUrl || null,
        imageUrls: isCarousel ? imageUrls : null,
        videoUrl: videoUrl || null,
        link: link.trim() || null,
        companyId,
        platforms: {
          facebook: selectedFacebook || false,
          instagram: selectedInstagram || false,
          linkedin: selectedLinkedIn || false,
          youtube: selectedYouTube || false,
          tiktok: selectedTikTok || false,
        },
        instagramMediaType: selectedInstagram ? instagramMediaType : null,
        youtubeTitle: selectedYouTube
          ? youtubeTitle.trim() || message.slice(0, 100)
          : null,
        youtubePrivacy: selectedYouTube ? youtubePrivacy : null,
        scheduledAt: Timestamp.fromDate(scheduledAt),
        status: "scheduled",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-zinc-950/60 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/40">
        <div className="z-10 sticky top-0 px-6 py-4 flex items-center bg-black justify-between rounded-t-2xl">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Programar publicación
            </h3>
            <p className="text-sm text-white/50">
              {format(date, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
          <Button className="border-none outline-0" onClick={onClose}>
            <X size={30} color="white" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título (calendario)</Label>
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
              <Label>Hora</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={saving}
                className="w-40 bg-white"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Redes</Label>
            {loadingAccounts ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center">
                {facebookAccount && (
                  <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                    <Checkbox
                      id="fb"
                      checked={selectedFacebook}
                      onCheckedChange={(c) => setSelectedFacebook(c === true)}
                      disabled={saving}
                    />
                    <Label htmlFor="fb">Facebook</Label>
                  </div>
                )}
                {instagramAccount && (
                  <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg flex-wrap">
                    <Checkbox
                      id="ig"
                      checked={selectedInstagram}
                      onCheckedChange={(c) => {
                        setSelectedInstagram(c === true);
                        if (!c) {
                          setInstagramMediaType("FEED");
                          setImageUrls([]);
                        }
                      }}
                      disabled={saving}
                    />
                    <Label htmlFor="ig">Instagram</Label>
                    {selectedInstagram && (
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
                        <SelectTrigger className="h-8 w-36 bg-white">
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
                )}
                {linkedinAccount && (
                  <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                    <Checkbox
                      id="li"
                      checked={selectedLinkedIn}
                      onCheckedChange={(c) => setSelectedLinkedIn(c === true)}
                      disabled={saving}
                    />
                    <Label htmlFor="li">LinkedIn</Label>
                  </div>
                )}
                {youtubeAccount && (
                  <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                    <Checkbox
                      id="yt"
                      checked={selectedYouTube}
                      onCheckedChange={(c) => setSelectedYouTube(c === true)}
                      disabled={saving}
                    />
                    <Label htmlFor="yt">YouTube</Label>
                  </div>
                )}
                {tiktokAccount && (
                  <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                    <Checkbox
                      id="tt"
                      checked={selectedTikTok}
                      onCheckedChange={(c) => setSelectedTikTok(c === true)}
                      disabled={saving}
                    />
                    <Label htmlFor="tt">TikTok</Label>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedYouTube && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Título YouTube</Label>
                <Input
                  value={youtubeTitle}
                  onChange={(e) => setYoutubeTitle(e.target.value)}
                  maxLength={100}
                  className="bg-white"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Privacidad</Label>
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
              Carrusel: {imageUrls.length}/10 (mín. 2). FB/LI usarán la 1ª
              imagen.
            </p>
          )}

          <div className="flex justify-between gap-2 bg-zinc-950/50 text-white rounded">
            <AICaptionGenerator
              platform="general"
              onGenerate={(c) => setMessage(c)}
            />
            <Separator orientation="vertical" />
            <div className="flex flex-col w-full gap-2 p-4">
              <span>Texto / Caption</span>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none bg-white text-black"
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex justify-between gap-2 bg-zinc-950/50 text-white rounded">
            <AIImageGenerator
              onGenerate={(url) => {
                setVideoUrl(null);
                if (isCarousel) {
                  if (imageUrls.length >= 10) return;
                  const next = [...imageUrls, url];
                  setImageUrls(next);
                  setImageUrl(next[0]);
                } else {
                  setImageUrls([]);
                  setImageUrl(url);
                }
              }}
            />
            <Separator orientation="vertical" />
            <div className="flex w-full flex-col gap-2 p-4 text-black">
              <span>Media</span>
              <div className="flex flex-wrap justify-center gap-2">
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
                    </div>
                  ))}
                </div>
              ) : (
                (imageUrl || videoUrl) && (
                  <div className="relative rounded-lg overflow-hidden border">
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
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={removeMedia}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Enlace (Facebook)</Label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={saving}
              className="bg-white"
            />
          </div>

          <PostPreview
            message={message}
            imageUrl={isCarousel ? imageUrls[0] || null : imageUrl}
            videoUrl={videoUrl}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-4 border-t border-white/40">
            <Button variant="outline" onClick={onClose} disabled={saving}>
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
                "Programar"
              )}
            </Button>
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
