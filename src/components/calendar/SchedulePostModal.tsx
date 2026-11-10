"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ImagePlus,
  Video,
  X,
  FolderOpen,
  Pencil,
  Trash2,
} from "lucide-react";
import { MediaLibraryPicker } from "@/components/social/MediaLibraryPicker";
import { saveMediaToLibrary } from "@/lib/media";
import { AICaptionGenerator } from "@/components/social/AICaptionGenerator";
import { AIImageGenerator } from "@/components/social/AIImageGenerator";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PostPreview } from "../social/PostPreview";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import type { ScheduledPost } from "@/app/dashboard/(view)/calendar/page";
import { cn } from "@/lib/utils";
// Si el tipo no está exportado desde page, define ScheduledPost aquí igual que en el calendario.

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
  /** null / undefined = crear; con post = detalle */
  post?: ScheduledPost | null;
  canEdit?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programado",
  publishing: "Publicando…",
  published: "Publicado",
  failed: "Falló",
};

const TIKTOK_PRIVACY_OPTIONS = [
  { value: "PUBLIC_TO_EVERYONE", label: "Público" },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Amigos" },
  { value: "FOLLOWER_OF_CREATOR", label: "Seguidores" },
  { value: "SELF_ONLY", label: "Solo yo" },
] as const;

type TikTokPrivacy = (typeof TIKTOK_PRIVACY_OPTIONS)[number]["value"];

const YOUTUBE_PRIVACY_OPTIONS = [
  { value: "public", label: "Público" },
  { value: "unlisted", label: "No listado" },
  { value: "private", label: "Privado" },
] as const;

const IG_TYPE_OPTIONS: { value: IgMediaType; label: string }[] = [
  { value: "FEED", label: "Feed" },
  { value: "CAROUSEL", label: "Carrusel" },
  { value: "REELS", label: "Reel" },
  { value: "STORIES", label: "Historia" },
];

export function SchedulePostModal({
  date,
  open,
  post = null,
  canEdit: canEditProp,
  onClose,
  onSaved,
}: Props) {
  const isCreate = !post;

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
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
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubePrivacy, setYoutubePrivacy] = useState<
    "public" | "unlisted" | "private"
  >("public");
  const [tiktokPrivacy, setTiktokPrivacy] =
    useState<TikTokPrivacy>("PUBLIC_TO_EVERYONE");
  const [tiktokAllowComment, setTiktokAllowComment] = useState(true);
  const [tiktokAllowDuet, setTiktokAllowDuet] = useState(false);
  const [tiktokAllowStitch, setTiktokAllowStitch] = useState(false);
  const [tiktokCommercial, setTiktokCommercial] = useState(false);
  const [tiktokBrandOrganic, setTiktokBrandOrganic] = useState(false);
  const [tiktokBrandContent, setTiktokBrandContent] = useState(false);

  const [dateStr, setDateStr] = useState("");
  const [time, setTime] = useState("10:00");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const companyId = useAuthStore((s) => s.companyId);
  const appUser = useAuthStore((s) => s.appUser); // ← faltaba
  const user = useAuthStore((s) => s.user);
  const memberRole = useAuthStore((s) => s.memberRole);
  const actorName = appUser?.name || user?.email || null;
  const roleCanEdit = memberRole === "admin" || memberRole === "editor";
  const canEdit = canEditProp !== undefined ? canEditProp : roleCanEdit;

  const canMutate =
    canEdit && (isCreate || (post?.status === "scheduled" && editing));
  const locked = !canMutate;

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
    setTiktokPrivacy(
      ((p as any).tiktokPrivacy as typeof tiktokPrivacy) ||
        "PUBLIC_TO_EVERYONE",
    );
    setTiktokAllowComment(!(p as any).disableComment);
    setTiktokAllowDuet(!(p as any).disableDuet);
    setTiktokAllowStitch(!(p as any).disableStitch);
    setTiktokCommercial(!!(p as any).commercialDisclosure);
    setTiktokBrandOrganic(!!(p as any).brandOrganicToggle);
    setTiktokBrandContent(!!(p as any).brandContentToggle);
  };

  const resetCreate = (d: Date) => {
    setTitle("");
    setMessage("");
    setImageUrl(null);
    setImageUrls([]);
    setVideoUrl(null);
    setLink("");
    setTime("10:00");
    setDateStr(format(d, "yyyy-MM-dd"));
    setYoutubeTitle("");
    setYoutubePrivacy("public");
    setInstagramMediaType("FEED");
    setTiktokPrivacy("PUBLIC_TO_EVERYONE");
    setTiktokAllowComment(true);
    setTiktokAllowDuet(false);
    setTiktokAllowStitch(false);
    setTiktokCommercial(false);
    setTiktokBrandOrganic(false);
    setTiktokBrandContent(false);
    setSelectedFacebook(false);
    setSelectedInstagram(false);
    setSelectedLinkedIn(false);
    setSelectedYouTube(false);
    setSelectedTikTok(false);
  };

  // Cargar cuentas
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
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as SocialAccount[];
        setAccounts(data);
        // NO marcar redes aquí
      } catch (e) {
        console.error(e);
        toast.error("Error al cargar cuentas");
      } finally {
        setLoadingAccounts(false);
      }
    };
    load();
  }, [open, companyId]);

  // Inicializar formulario al abrir
  useEffect(() => {
    if (!open) return;
    if (post) {
      loadFromPost(post);
      setEditing(false);
    } else {
      resetCreate(date);
    }
  }, [open, post, date]);

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
      const err = await res.json().catch(() => ({}));
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
        for (const f of list) {
          if (f.size > 10 * 1024 * 1024) {
            toast.error(`"${f.name}" supera 10MB`);
            continue;
          }
          uploaded.push(await uploadToR2(f));
        }
        const next = [...imageUrls, ...uploaded].slice(0, 10);
        setImageUrls(next);
        setImageUrl(next[0] || null);
        toast.success("Imágenes listas", { id: tid });
      } else {
        const file = files[0];
        if (file.size > 10 * 1024 * 1024) {
          toast.error("La imagen no puede superar 10MB", { id: tid });
          return;
        }
        setImageUrls([]);
        setImageUrl(await uploadToR2(file));
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
    if (file.size > 100 * 1024 * 1024) {
      toast.error("El video no puede superar 100MB");
      return;
    }
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

  const removeMedia = () => {
    if (locked) return;
    setImageUrl(null);
    setImageUrls([]);
    setVideoUrl(null);
  };

  const buildScheduledAt = () => {
    const [hours, minutes] = time.split(":").map(Number);
    if (isCreate) {
      const scheduledAt = new Date(date);
      scheduledAt.setHours(hours, minutes, 0, 0);
      return scheduledAt;
    }
    const scheduledAt = new Date(dateStr + "T00:00:00");
    scheduledAt.setHours(hours, minutes, 0, 0);
    return scheduledAt;
  };

  const validate = () => {
    if (!canEdit) {
      toast.error("No tienes permiso");
      return false;
    }
    if (!companyId) {
      toast.error("No hay empresa asociada");
      return false;
    }
    if (!title.trim()) {
      toast.error("Escribe un título para el calendario");
      return false;
    }
    if (
      !selectedFacebook &&
      !selectedInstagram &&
      !selectedLinkedIn &&
      !selectedYouTube &&
      !selectedTikTok
    ) {
      toast.error("Selecciona al menos una red");
      return false;
    }
    if (selectedTikTok) {
      if (!videoUrl) {
        toast.error("TikTok requiere un video");
        return false;
      }
      if (!tiktokPrivacy) {
        toast.error("Elige la visibilidad de TikTok");
        return false;
      }
      if (tiktokCommercial) {
        if (!tiktokBrandOrganic && !tiktokBrandContent) {
          toast.error(
            "Indica si el contenido promociona tu marca, un tercero, o ambos",
          );
          return false;
        }
        if (tiktokBrandContent && tiktokPrivacy === "SELF_ONLY") {
          toast.error(
            "Branded content no puede publicarse solo para ti (Solo yo)",
          );
          return false;
        }
      }
    }
    if (selectedInstagram) {
      if (instagramMediaType === "CAROUSEL" && imageUrls.length < 2) {
        toast.error("El carrusel necesita al menos 2 imágenes");
        return false;
      }
      if (instagramMediaType === "REELS" && !videoUrl) {
        toast.error("Los Reels requieren un video");
        return false;
      }
      if (
        instagramMediaType !== "CAROUSEL" &&
        instagramMediaType !== "REELS" &&
        !imageUrl &&
        !videoUrl
      ) {
        toast.error("Instagram requiere imagen o video");
        return false;
      }
    }
    if ((selectedYouTube || selectedTikTok) && !videoUrl) {
      toast.error("YouTube y TikTok requieren un video");
      return false;
    }
    if (selectedYouTube && !youtubeTitle.trim() && !message.trim()) {
      toast.error("YouTube requiere un título");
      return false;
    }
    const scheduledAt = buildScheduledAt();
    if (scheduledAt.getTime() < Date.now()) {
      toast.error("La fecha/hora debe ser en el futuro");
      return false;
    }
    return true;
  };

  const baseContent = () => {
    const scheduledAt = buildScheduledAt();
    return {
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
      tiktokPrivacy: selectedTikTok ? tiktokPrivacy : null,
      disableComment: selectedTikTok ? !tiktokAllowComment : null,
      disableDuet: selectedTikTok ? !tiktokAllowDuet : null,
      disableStitch: selectedTikTok ? !tiktokAllowStitch : null,
      commercialDisclosure: selectedTikTok ? tiktokCommercial : null,
      brandOrganicToggle: selectedTikTok ? tiktokBrandOrganic : null,
      brandContentToggle: selectedTikTok ? tiktokBrandContent : null,
      scheduledAt: Timestamp.fromDate(scheduledAt),
      updatedAt: Timestamp.now(),
    };
  };

  const handleSave = async () => {
    if (!validate()) return;
    const tid = toast.loading(isCreate ? "Programando…" : "Guardando…");
    try {
      setSaving(true);
      if (isCreate) {
        await addDoc(collection(db, "scheduledPosts"), {
          ...baseContent(),
          status: "scheduled",
          createdAt: Timestamp.now(),
          createdByUid: user?.uid || null,
          createdByName: actorName,
          createdByEmail: user?.email || null,
        });
        toast.success("Publicación programada", { id: tid });
        onSaved();
        onClose();
      } else if (post) {
        await updateDoc(doc(db, "scheduledPosts", post.id), {
          ...baseContent(),
          updatedByUid: user?.uid || null,
          updatedByName: actorName,
          updatedByEmail: user?.email || null,
        });
        toast.success("Cambios guardados", { id: tid });
        setEditing(false);
        onSaved();
      }
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
    if (!post || !canEdit || post.status !== "scheduled") return;
    setDeleting(true);
    const tid = toast.loading("Eliminando…");
    try {
      await deleteDoc(doc(db, "scheduledPosts", post.id));
      toast.success("Publicación eliminada", { id: tid });
      setDeleteOpen(false);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar", { id: tid });
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  const headerTitle = isCreate
    ? "Programar publicación"
    : editing
      ? "Editar publicación"
      : "Publicación programada";

  const headerSubtitle = isCreate
    ? format(date, "EEEE d 'de' MMMM yyyy", { locale: es })
    : post
      ? format(post.scheduledAt, "EEEE d 'de' MMMM yyyy · HH:mm", {
          locale: es,
        })
      : "";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-zinc-950/60 rounded-2xl shadow-xl max-w-6xl w-fit max-h-[90vh] overflow-y-auto border border-white/40">
          <div className="z-10 sticky top-0 px-6 py-4 flex items-center bg-black justify-between rounded-t-2xl">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {headerTitle}
              </h3>
              <p className="text-sm text-white/50 capitalize">
                {headerSubtitle}
              </p>
              {!isCreate && post && (
                <div className="flex gap-2 mt-1">
                  <Badge>{STATUS_LABEL[post.status] || post.status}</Badge>
                  {editing && (
                    <Badge
                      variant="outline"
                      className="text-amber-300 border-amber-400/50"
                    >
                      Editando
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="border-none outline-0"
              onClick={onClose}
            >
              <X size={30} color="white" />
            </Button>
          </div>
          {!isCreate && post && (
            <div className="px-6 pt-2">
              <p className="text-[10px] text-white/70">
                Creado por {post.createdByName || post.createdByEmail || "—"}
                {post.createdAt
                  ? ` · ${format(
                      post.createdAt instanceof Date
                        ? post.createdAt
                        : new Date(post.createdAt as any),
                      "d MMM HH:mm",
                      { locale: es },
                    )}`
                  : ""}
              </p>
              {post.updatedByName && (
                <p className="text-[10px] text-white/50">
                  Última edición: {post.updatedByName}
                </p>
              )}
            </div>
          )}

          {!isCreate && post && post.status !== "scheduled" && (
            <p className="mx-6 mt-3 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-md p-2">
              Este post ya no se puede editar (
              {STATUS_LABEL[post.status] || post.status}).
            </p>
          )}

          <div
            className={cn(
              !locked ? "grid grid-cols-1 lg:grid-cols-5" : "grid grid-cols-1",
            )}
          >
            {!locked && (
              <div className="lg:col-span-3 p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Título (calendario)</Label>
                    <Input
                      placeholder="Ej: Post de Halloween"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={80}
                      disabled={locked || saving}
                      className="bg-white"
                    />
                  </div>
                  {!isCreate && (
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
                  )}
                  <div className="space-y-2">
                    <Label className="text-white">Hora</Label>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      disabled={locked || saving}
                      className="w-40 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white">Redes</Label>
                  {loadingAccounts ? (
                    <p className="text-sm text-muted-foreground">Cargando...</p>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-white">Redes</Label>
                        <p className="text-xs text-white/50 mt-0.5">
                          Elige al menos una. Solo aparecen las cuentas
                          conectadas.
                        </p>
                      </div>

                      {loadingAccounts ? (
                        <p className="text-sm text-white/50">
                          Cargando cuentas…
                        </p>
                      ) : accounts.length === 0 ? (
                        <p className="text-sm text-amber-200/90">
                          No hay redes conectadas. Conéctalas desde cada sección
                          del dashboard.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {facebookAccount && (
                            <div
                              className={cn(
                                " rounded-xl border p-3 space-y-3",
                                selectedFacebook
                                  ? "bg-white/15 border-white/30"
                                  : "bg-white/5 border-white/10",
                              )}
                            >
                              <label className="flex items-center gap-3 cursor-pointer">
                                <Checkbox
                                  checked={selectedFacebook}
                                  onCheckedChange={(c) =>
                                    setSelectedFacebook(c === true)
                                  }
                                  disabled={locked || saving}
                                />
                                <span className="text-sm text-white font-medium">
                                  Facebook
                                </span>
                                <span className="text-xs text-white/40 truncate ml-auto">
                                  {facebookAccount.name}
                                </span>
                              </label>{" "}
                              {selectedFacebook && !locked && (
                                <div className="space-y-2">
                                  <Label className="text-white">
                                    Enlace (Facebook)
                                  </Label>
                                  <Input
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    disabled={locked || saving}
                                    className="bg-white"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {instagramAccount && (
                            <div
                              className={cn(
                                "rounded-xl border p-3 space-y-2 transition-colors",
                                selectedInstagram
                                  ? "bg-white/15 border-pink-400/40"
                                  : "bg-white/5 border-white/10",
                              )}
                            >
                              <label className="flex items-center gap-3 cursor-pointer">
                                <Checkbox
                                  checked={selectedInstagram}
                                  onCheckedChange={(c) => {
                                    setSelectedInstagram(c === true);
                                    if (!c) {
                                      setInstagramMediaType("FEED");
                                      setImageUrls([]);
                                    }
                                  }}
                                  disabled={locked || saving}
                                />
                                <span className="text-sm text-white font-medium">
                                  Instagram
                                </span>
                                <span className="text-xs text-white/40 truncate ml-auto">
                                  @
                                  {instagramAccount.username ||
                                    instagramAccount.name}
                                </span>
                              </label>
                              {selectedInstagram && !locked && (
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
                                  <SelectTrigger className="h-9 bg-white text-black">
                                    <SelectValue placeholder="Tipo de publicación">
                                      {
                                        IG_TYPE_OPTIONS.find(
                                          (o) => o.value === instagramMediaType,
                                        )?.label
                                      }
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {IG_TYPE_OPTIONS.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          )}

                          {linkedinAccount && (
                            <label
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer",
                                selectedLinkedIn
                                  ? "bg-white/15 border-blue-400/40"
                                  : "bg-white/5 border-white/10 hover:bg-white/10",
                                (locked || saving) &&
                                  "opacity-60 pointer-events-none",
                              )}
                            >
                              <Checkbox
                                checked={selectedLinkedIn}
                                onCheckedChange={(c) =>
                                  setSelectedLinkedIn(c === true)
                                }
                                disabled={locked || saving}
                              />
                              <span className="text-sm text-white font-medium">
                                LinkedIn
                              </span>
                            </label>
                          )}

                          {youtubeAccount && (
                            <div
                              className={cn(
                                "rounded-xl border p-3 space-y-2",
                                selectedYouTube
                                  ? "bg-white/15 border-red-400/40"
                                  : "bg-white/5 border-white/10",
                              )}
                            >
                              <label className="flex items-center gap-3 cursor-pointer">
                                <Checkbox
                                  checked={selectedYouTube}
                                  onCheckedChange={(c) =>
                                    setSelectedYouTube(c === true)
                                  }
                                  disabled={locked || saving}
                                />
                                <span className="text-sm text-white font-medium">
                                  YouTube
                                </span>
                              </label>
                              {selectedYouTube && !locked && (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <Input
                                    placeholder="Título del video"
                                    value={youtubeTitle}
                                    onChange={(e) =>
                                      setYoutubeTitle(e.target.value)
                                    }
                                    maxLength={100}
                                    className="bg-white"
                                    disabled={saving}
                                  />
                                  <Select
                                    value={youtubePrivacy}
                                    onValueChange={(v) =>
                                      setYoutubePrivacy(
                                        v as "public" | "unlisted" | "private",
                                      )
                                    }
                                    disabled={saving}
                                  >
                                    <SelectTrigger className="bg-white text-black">
                                      <SelectValue>
                                        {
                                          YOUTUBE_PRIVACY_OPTIONS.find(
                                            (o) => o.value === youtubePrivacy,
                                          )?.label
                                        }
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {YOUTUBE_PRIVACY_OPTIONS.map((o) => (
                                        <SelectItem
                                          key={o.value}
                                          value={o.value}
                                        >
                                          {o.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          )}

                          {tiktokAccount && (
                            <div
                              className={cn(
                                "sm:col-span-2 rounded-xl border p-3 space-y-3",
                                selectedTikTok
                                  ? "bg-white/15 border-white/30"
                                  : "bg-white/5 border-white/10",
                              )}
                            >
                              <label className="flex items-center gap-3 cursor-pointer">
                                <Checkbox
                                  checked={selectedTikTok}
                                  onCheckedChange={(c) =>
                                    setSelectedTikTok(c === true)
                                  }
                                  disabled={locked || saving}
                                />
                                <span className="text-sm text-white font-medium">
                                  TikTok
                                </span>
                                <span className="text-xs text-white/40 truncate ml-auto">
                                  {tiktokAccount.name || tiktokAccount.username}
                                </span>
                              </label>

                              {selectedTikTok && !locked && (
                                <div className="space-y-3 pl-1 border-l-2 border-white/10 ml-1">
                                  {/* Visibilidad — la que ya tienes con labels legibles */}

                                  <div className="space-y-2">
                                    <p className="text-xs text-white/50">
                                      Interacciones
                                    </p>
                                    <label className="flex items-center gap-2 text-sm text-white/90 cursor-pointer">
                                      <Checkbox
                                        checked={tiktokAllowComment}
                                        onCheckedChange={(c) =>
                                          setTiktokAllowComment(c === true)
                                        }
                                        disabled={saving}
                                      />
                                      Permitir comentarios
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-white/90 cursor-pointer">
                                      <Checkbox
                                        checked={tiktokAllowDuet}
                                        onCheckedChange={(c) =>
                                          setTiktokAllowDuet(c === true)
                                        }
                                        disabled={saving}
                                      />
                                      Permitir Duet
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-white/90 cursor-pointer">
                                      <Checkbox
                                        checked={tiktokAllowStitch}
                                        onCheckedChange={(c) =>
                                          setTiktokAllowStitch(c === true)
                                        }
                                        disabled={saving}
                                      />
                                      Permitir Stitch
                                    </label>
                                  </div>

                                  <label className="flex items-start gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={tiktokCommercial}
                                      onCheckedChange={(c) => {
                                        const on = c === true;
                                        setTiktokCommercial(on);
                                        if (!on) {
                                          setTiktokBrandOrganic(false);
                                          setTiktokBrandContent(false);
                                        }
                                      }}
                                      disabled={saving}
                                    />
                                    <span className="text-sm text-white/90 leading-snug">
                                      Contenido promocional / comercial
                                      <span className="block text-xs text-white/45">
                                        Actívalo si el video promociona una
                                        marca o producto
                                      </span>
                                    </span>
                                  </label>

                                  {tiktokCommercial && (
                                    <div className="flex flex-col gap-2 pl-6">
                                      <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                                        <Checkbox
                                          checked={tiktokBrandOrganic}
                                          onCheckedChange={(c) =>
                                            setTiktokBrandOrganic(c === true)
                                          }
                                          disabled={saving}
                                        />
                                        Promociona tu propia marca
                                      </label>
                                      <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                                        <Checkbox
                                          checked={tiktokBrandContent}
                                          onCheckedChange={(c) =>
                                            setTiktokBrandContent(c === true)
                                          }
                                          disabled={saving}
                                        />
                                        Promociona una marca de terceros (paid
                                        partnership)
                                      </label>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedYouTube && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-white">Título YouTube</Label>
                      <Input
                        value={youtubeTitle}
                        onChange={(e) => setYoutubeTitle(e.target.value)}
                        maxLength={100}
                        className="bg-white"
                        disabled={locked || saving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Privacidad</Label>
                      <Select
                        value={youtubePrivacy}
                        onValueChange={(v) =>
                          setYoutubePrivacy(
                            v as "public" | "unlisted" | "private",
                          )
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
                {selectedTikTok && (
                  <div className="space-y-2">
                    <Label className="text-white">Visibilidad TikTok</Label>
                    <Select
                      value={tiktokPrivacy}
                      onValueChange={(v) =>
                        setTiktokPrivacy(
                          v as
                            | "PUBLIC_TO_EVERYONE"
                            | "MUTUAL_FOLLOW_FRIENDS"
                            | "FOLLOWER_OF_CREATOR"
                            | "SELF_ONLY",
                        )
                      }
                      disabled={locked || saving}
                    >
                      <SelectTrigger className="bg-white max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PUBLIC_TO_EVERYONE">
                          Público
                        </SelectItem>
                        <SelectItem value="MUTUAL_FOLLOW_FRIENDS">
                          Amigos
                        </SelectItem>
                        <SelectItem value="FOLLOWER_OF_CREATOR">
                          Seguidores
                        </SelectItem>
                        <SelectItem value="SELF_ONLY">Solo yo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {isCarousel && (
                  <p className="text-xs text-amber-200">
                    Carrusel: {imageUrls.length}/10 (mín. 2). FB/LI usarán la 1ª
                    imagen.
                  </p>
                )}

                <div className="flex flex-col lg:flex-row justify-between gap-2 bg-zinc-950/50 text-white rounded">
                  {!locked && (
                    <>
                      <AICaptionGenerator
                        platform="general"
                        onGenerate={(c) => setMessage(c)}
                      />
                      <Separator
                        orientation="vertical"
                        className="hidden lg:block"
                      />
                    </>
                  )}
                  <div className="flex flex-col w-full gap-2 p-4">
                    <span>Texto / Caption</span>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="resize-none bg-white text-black"
                      disabled={locked || saving}
                    />
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row justify-between gap-2 bg-zinc-950/50 text-white rounded">
                  {!locked && (
                    <>
                      <AIImageGenerator
                        onGenerate={(url) => {
                          setVideoUrl(null);
                          if (isCarousel) {
                            if (imageUrls.length >= 10) {
                              toast.error("Máximo 10 imágenes");
                              return;
                            }
                            const next = [...imageUrls, url];
                            setImageUrls(next);
                            setImageUrl(next[0]);
                          } else {
                            setImageUrls([]);
                            setImageUrl(url);
                          }
                        }}
                      />
                      <Separator
                        orientation="vertical"
                        className="hidden lg:block"
                      />
                    </>
                  )}
                  <div className="flex w-full flex-col gap-2 p-4 text-black">
                    <span className="text-white">Media</span>
                    {!locked && (
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
                            saving ||
                            uploadingMedia ||
                            (!!videoUrl && !isCarousel)
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
                                  const next = imageUrls.filter(
                                    (_, j) => j !== i,
                                  );
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
                        <div className="relative rounded-lg overflow-hidden border">
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
                              onClick={removeMedia}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {!isCreate &&
                  post?.results &&
                  Object.keys(post.results).length > 0 && (
                    <div className="space-y-2 p-3 bg-white/60 rounded-lg">
                      <Label>Resultados de publicación</Label>
                      {Object.entries(post.results).map(
                        ([platform, result]) => (
                          <p key={platform} className="text-sm">
                            <span className="font-medium capitalize">
                              {platform}:{" "}
                            </span>
                            <span
                              className={
                                result.success
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {result.success
                                ? "OK"
                                : result.message || "Error"}
                            </span>
                          </p>
                        ),
                      )}
                    </div>
                  )}
              </div>
            )}

            <div className="self-start sticky top-16 lg:col-span-2 p-6 space-y-5">
              <PostPreview
                message={message}
                imageUrl={isCarousel ? imageUrls[0] || null : imageUrl}
                videoUrl={videoUrl}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/40">
                {/* Izquierda: eliminar solo en detalle + scheduled + permiso */}
                {!isCreate && canEdit && post?.status === "scheduled" ? (
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

                <div className="flex gap-2 ml-auto">
                  {isCreate ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={saving}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={saving || uploadingMedia || !canEdit}
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
                    </>
                  ) : !editing ? (
                    <>
                      <Button variant="outline" onClick={onClose}>
                        Cerrar
                      </Button>
                      {canEdit && post?.status === "scheduled" && (
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
