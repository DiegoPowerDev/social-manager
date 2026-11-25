"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ExternalLink, FolderOpen } from "lucide-react";
import { MediaLibraryPicker } from "@/components/social/MediaLibraryPicker";
import { saveMediaToLibrary } from "@/lib/media";
import { auth, db } from "@/lib/firebase";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Loader2,
  ImagePlus,
  Video,
  X,
  CheckCircle2,
  XCircle,
  LucideLoaderCircle,
} from "lucide-react";
import { AICaptionGenerator } from "@/components/social/AICaptionGenerator";
import { AIImageGenerator } from "@/components/social/AIImageGenerator";
import { Separator } from "@/components/ui/separator";
import { PostPreview } from "@/components/social/PostPreview";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SocialAccount {
  id: string;
  platform: "facebook" | "instagram" | "linkedin" | "youtube" | "tiktok";
  name?: string;
  username?: string;
  pageId?: string;
  igUserId?: string;
  personId?: string;
  channelId?: string;
  openId?: string;
  accessToken: string;
  refreshToken?: string;
}

interface PublishResult {
  platform: string;
  platformKey: "facebook" | "instagram" | "linkedin" | "youtube" | "tiktok";
  success: boolean | null; // null = publicando
  message: string;
  url?: string | null;
}

type IgMediaType = "FEED" | "REELS" | "STORIES" | "CAROUSEL";
type TikTokPrivacy =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY";

const TIKTOK_PRIVACY_OPTIONS: { value: TikTokPrivacy; label: string }[] = [
  { value: "PUBLIC_TO_EVERYONE", label: "Público" },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Amigos" },
  { value: "FOLLOWER_OF_CREATOR", label: "Seguidores" },
  { value: "SELF_ONLY", label: "Solo yo" },
];

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
const PLATFORM_ICONS: Record<PublishResult["platformKey"], string> = {
  facebook: "/facebook-icon.svg",
  instagram: "/instagram-icon.svg",
  linkedin: "/linkedin.svg",
  youtube: "/youtube.svg",
  tiktok: "/tiktok.svg",
};

export default function BulkPublishPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const user = useAuthStore((s) => s.user);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const companyId = useAuthStore((s) => s.companyId);
  const memberRole = useAuthStore((s) => s.memberRole);
  const canEdit = memberRole === "admin" || memberRole === "editor";

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

  const [publishing, setPublishing] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [results, setResults] = useState<PublishResult[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!companyId) {
      setLoadingAccounts(false);
      return;
    }
    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const q = query(
          collection(db, "socialAccounts"),
          where("companyId", "==", companyId),
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as SocialAccount[];
        setAccounts(data);
        // No pre-marcar redes
      } catch (error) {
        console.error(error);
        toast.error("Error al cargar cuentas");
      } finally {
        setLoadingAccounts(false);
      }
    };
    loadAccounts();
  }, [companyId]);

  const facebookAccount = accounts.find((a) => a.platform === "facebook");
  const instagramAccount = accounts.find((a) => a.platform === "instagram");
  const linkedinAccount = accounts.find((a) => a.platform === "linkedin");
  const youtubeAccount = accounts.find((a) => a.platform === "youtube");
  const tiktokAccount = accounts.find((a) => a.platform === "tiktok");

  const uploadToR2 = async (file: File) => {
    if (!companyId) {
      throw new Error(
        "No hay empresa asociada. Recarga la página o vuelve a iniciar sesión.",
      );
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "bulk");
    formData.append("companyId", companyId);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      if (data.code === "STORAGE_FULL" || res.status === 403) {
        throw new Error(data.error || "Error al subir el logo");
      } else {
        throw new Error(data.error || "Error al subir el logo");
      }
    }
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
    if (item.type === "video") {
      setImageUrl(null);
      setImageUrls([]);
      setVideoUrl(item.url);
      toast.success("Video desde biblioteca");
      return;
    }
    setVideoUrl(null);
    if (selectedInstagram && instagramMediaType === "CAROUSEL") {
      if (imageUrls.length >= 10) {
        toast.error("Máximo 10 imágenes en el carrusel");
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
    if (!files?.length) return;
    const isCarouselMode =
      selectedInstagram && instagramMediaType === "CAROUSEL";
    try {
      setUploadingMedia(true);
      setVideoUrl(null);
      if (isCarouselMode) {
        const list = Array.from(files);
        if (imageUrls.length + list.length > 10) {
          toast.error("Máximo 10 imágenes en el carrusel");
          return;
        }
        const tid = toast.loading("Subiendo imágenes…");
        const uploaded: string[] = [];
        for (const file of list) {
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`"${file.name}" supera 10MB`);
            continue;
          }
          uploaded.push(await uploadToR2(file));
        }
        const next = [...imageUrls, ...uploaded].slice(0, 10);
        setImageUrls(next);
        setImageUrl(next[0] || null);
        toast.success(`${uploaded.length} imagen(es) listas`, { id: tid });
      } else {
        const file = files[0];
        if (file.size > 10 * 1024 * 1024) {
          toast.error("La imagen no puede superar los 10MB");
          return;
        }
        const tid = toast.loading("Subiendo imagen…");
        setImageUrls([]);
        setImageUrl(await uploadToR2(file));
        toast.success("Imagen lista", { id: tid });
      }
    } catch (err: any) {
      toast.error(err.message || "Error al subir la imagen");
    } finally {
      setUploadingMedia(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error("El video no puede superar los 100MB");
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
      toast.error(err.message || "Error al subir el video", { id: tid });
    } finally {
      setUploadingMedia(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const removeMedia = () => {
    setImageUrl(null);
    setImageUrls([]);
    setVideoUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const clearForm = () => {
    setMessage("");
    setImageUrl(null);
    setImageUrls([]);
    setVideoUrl(null);
    setLink("");
    setYoutubeTitle("");
    setTiktokPrivacy("PUBLIC_TO_EVERYONE");
    setTiktokAllowComment(true);
    setTiktokAllowDuet(false);
    setTiktokAllowStitch(false);
    setTiktokCommercial(false);
    setTiktokBrandOrganic(false);
    setTiktokBrandContent(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handlePublish = async () => {
    const authUser = auth.currentUser;
    if (!authUser) {
      toast.error("Sesión expirada. Vuelve a iniciar sesión.");
      return;
    }
    const idToken = await authUser.getIdToken();

    if (!companyId || !canEdit) {
      toast.error(!canEdit ? "No tienes permiso para publicar" : "Sin empresa");
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

    if ((selectedYouTube || selectedTikTok) && !videoUrl) {
      toast.error("YouTube y TikTok requieren un video");
      return;
    }

    if (selectedYouTube && !youtubeTitle.trim() && !message.trim()) {
      toast.error("YouTube requiere un título");
      return;
    }

    if (selectedInstagram) {
      if (instagramMediaType === "CAROUSEL" && imageUrls.length < 2) {
        toast.error("El carrusel de Instagram necesita al menos 2 imágenes");
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
        toast.error("Instagram requiere una imagen o un video");
        return;
      }
    }

    if (selectedTikTok) {
      if (!tiktokPrivacy) {
        toast.error("Elige la visibilidad de TikTok");
        return;
      }
      if (tiktokCommercial) {
        if (!tiktokBrandOrganic && !tiktokBrandContent) {
          toast.error(
            "Indica si el contenido promociona tu marca, un tercero, o ambos",
          );
          return;
        }
        if (tiktokBrandContent && tiktokPrivacy === "SELF_ONLY") {
          toast.error(
            "Branded content no puede publicarse solo para ti (Solo yo)",
          );
          return;
        }
      }
    }

    setPublishing(true);

    const pending = (
      platform: string,
      platformKey: PublishResult["platformKey"],
    ): PublishResult => ({
      platform,
      platformKey,
      success: null,
      message: "Publicando…",
      url: null,
    });

    const initial: PublishResult[] = [];
    if (selectedFacebook && facebookAccount) {
      initial.push(pending("Facebook", "facebook"));
    }
    if (selectedInstagram && instagramAccount) {
      initial.push(pending("Instagram", "instagram"));
    }
    if (selectedLinkedIn && linkedinAccount) {
      initial.push(pending("LinkedIn", "linkedin"));
    }
    if (selectedYouTube && youtubeAccount) {
      initial.push(pending("YouTube", "youtube"));
    }
    if (selectedTikTok && tiktokAccount) {
      initial.push(pending("TikTok", "tiktok"));
    }
    setResults(initial);

    const patch = (
      platformKey: PublishResult["platformKey"],
      update: Partial<PublishResult>,
    ) => {
      setResults((prev) =>
        prev.map((r) =>
          r.platformKey === platformKey ? { ...r, ...update } : r,
        ),
      );
    };

    const resolveUrl = (
      platformKey: PublishResult["platformKey"],
      data: any,
    ): string | null => {
      if (!data) return null;
      if (typeof data.permalink === "string" && data.permalink) {
        return data.permalink;
      }
      if (typeof data.url === "string" && data.url) return data.url;

      if (platformKey === "facebook") {
        const id =
          data.postId || data.id || data.result?.id || data.result?.post_id;
        return id ? `https://www.facebook.com/${id}` : null;
      }

      if (platformKey === "instagram") {
        return data.permalink || data.result?.permalink || null;
      }

      if (platformKey === "linkedin") {
        if (data.result?.permalink) return data.result.permalink;
        const id =
          data.result?.id || data.linkedinPostId || data.id || data.postId;
        return id ? `https://www.linkedin.com/feed/update/${id}/` : null;
      }

      if (platformKey === "youtube") {
        const id =
          data.videoId ||
          data.id ||
          data.result?.id ||
          data.result?.videoId ||
          data.postId;
        return id ? `https://www.youtube.com/watch?v=${id}` : null;
      }

      // TikTok: a menudo no hay URL pública al instante
      return data.shareUrl || data.result?.share_url || null;
    };

    // ——— Facebook ———
    if (selectedFacebook && facebookAccount) {
      try {
        const res = await fetch("/api/publish/facebook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            pageId: facebookAccount.pageId,
            accessToken: facebookAccount.accessToken,
            pageName: facebookAccount.name,
            companyId,
            message,
            link: link || undefined,
            imageUrl: imageUrl || undefined,
            videoUrl: videoUrl || undefined,
          }),
        });
        const data = await res.json();
        patch("facebook", {
          success: res.ok,
          message: res.ok ? "Publicado" : data.error || "Error",
          url: res.ok ? resolveUrl("facebook", data) : null,
        });
      } catch (err: any) {
        patch("facebook", {
          success: false,
          message: err.message || "Error de conexión",
          url: null,
        });
      }
    }

    // ——— Instagram ———
    if (selectedInstagram && instagramAccount) {
      try {
        const res = await fetch("/api/publish/instagram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            igUserId: instagramAccount.igUserId,
            accessToken: instagramAccount.accessToken,
            username: instagramAccount.username,
            companyId,
            caption: instagramMediaType === "STORIES" ? undefined : message,
            imageUrl:
              instagramMediaType === "CAROUSEL"
                ? imageUrls[0]
                : imageUrl || undefined,
            imageUrls:
              instagramMediaType === "CAROUSEL" ? imageUrls : undefined,
            videoUrl: videoUrl || undefined,
            mediaType: instagramMediaType,
          }),
        });
        const data = await res.json();
        let okMsg = "Publicado";
        if (instagramMediaType === "STORIES") okMsg = "Historia publicada";
        if (instagramMediaType === "CAROUSEL") okMsg = "Carrusel publicado";

        patch("instagram", {
          success: res.ok,
          message: res.ok ? okMsg : data.error || "Error",
          url: res.ok ? resolveUrl("instagram", data) : null,
        });
      } catch (err: any) {
        patch("instagram", {
          success: false,
          message: err.message || "Error de conexión",
          url: null,
        });
      }
    }

    // ——— LinkedIn ———
    if (selectedLinkedIn && linkedinAccount) {
      try {
        const res = await fetch("/api/publish/linkedin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            personId: linkedinAccount.personId,
            accessToken: linkedinAccount.accessToken,
            name: linkedinAccount.name,
            companyId,
            text: message,
            imageUrl: imageUrl || undefined,
            videoUrl: videoUrl || undefined,
          }),
        });
        const data = await res.json();
        patch("linkedin", {
          success: res.ok,
          message: res.ok ? "Publicado" : data.error || "Error",
          url: res.ok ? resolveUrl("linkedin", data) : null,
        });
      } catch (err: any) {
        patch("linkedin", {
          success: false,
          message: err.message || "Error de conexión",
          url: null,
        });
      }
    }

    // ——— YouTube ———
    if (selectedYouTube && youtubeAccount) {
      try {
        const res = await fetch("/api/publish/youtube", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            companyId,
            channelId: youtubeAccount.channelId,
            accessToken: youtubeAccount.accessToken,
            refreshToken: youtubeAccount.refreshToken,
            accountDocId: youtubeAccount.id,
            title: youtubeTitle.trim() || message.slice(0, 100),
            description: message,
            videoUrl,
            privacyStatus: youtubePrivacy,
          }),
        });
        const data = await res.json();
        patch("youtube", {
          success: res.ok,
          message: res.ok ? "Video publicado" : data.error || "Error",
          url: res.ok ? resolveUrl("youtube", data) : null,
        });
      } catch (err: any) {
        patch("youtube", {
          success: false,
          message: err.message || "Error de conexión",
          url: null,
        });
      }
    }

    // ——— TikTok ———
    if (selectedTikTok && tiktokAccount) {
      try {
        const res = await fetch("/api/publish/tiktok", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            companyId,
            openId: tiktokAccount.openId,
            name: tiktokAccount.name || tiktokAccount.username,
            title: message.trim() || "Video",
            videoUrl,
            privacyLevel: tiktokPrivacy,
            disableComment: !tiktokAllowComment,
            disableDuet: !tiktokAllowDuet,
            disableStitch: !tiktokAllowStitch,
            commercialDisclosure: tiktokCommercial,
            brandOrganicToggle: tiktokBrandOrganic,
            brandContentToggle: tiktokBrandContent,
          }),
        });
        const data = await res.json();
        patch("tiktok", {
          success: res.ok,
          message: res.ok ? "Video enviado a TikTok" : data.error || "Error",
          url: res.ok ? resolveUrl("tiktok", data) : null,
        });
      } catch (err: any) {
        patch("tiktok", {
          success: false,
          message: err.message || "Error de conexión",
          url: null,
        });
      }
    }

    setPublishing(false);

    // Resumen final sin borrar el listado de resultados
    setResults((current) => {
      const ok = current.filter((r) => r.success === true).length;
      const fail = current.filter((r) => r.success === false).length;

      if (fail === 0 && ok > 0) {
        toast.success(`Publicado en ${ok} red${ok !== 1 ? "es" : ""}`);
        clearForm(); // limpia inputs; no toca results
      } else if (ok === 0) {
        toast.error("No se pudo publicar en ninguna red");
      } else {
        toast.warning(`${ok} ok · ${fail} con error`);
      }

      return current;
    });
  };

  function pendingResult(
    platform: string,
    platformKey: PublishResult["platformKey"],
  ): PublishResult {
    return {
      platform,
      platformKey,
      success: null,
      message: "Publicando…",
      url: null,
    };
  }

  function postUrlFromResponse(
    platformKey: PublishResult["platformKey"],
    data: any,
  ): string | null {
    if (data?.permalink) return data.permalink as string;
    if (data?.url) return data.url as string;

    if (platformKey === "facebook") {
      const id = data?.postId || data?.id || data?.result?.id;
      return id ? `https://www.facebook.com/${id}` : null;
    }
    if (platformKey === "instagram") {
      return (data?.permalink as string) || null;
    }
    if (platformKey === "linkedin") {
      const id = data?.result?.id || data?.linkedinPostId || data?.id;
      if (data?.result?.permalink) return data.result.permalink;
      return id ? `https://www.linkedin.com/feed/update/${id}/` : null;
    }
    if (platformKey === "youtube") {
      const id =
        data?.videoId || data?.id || data?.result?.id || data?.result?.videoId;
      return id ? `https://www.youtube.com/watch?v=${id}` : null;
    }
    // TikTok suele no devolver URL pública inmediata
    return null;
  }
  if (loadingAccounts) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LucideLoaderCircle className="animate-spin h-16 w-16 text-orange-400" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-1 flex-col h-full w-full">
        <div className="flex items-center justify-between bg-zinc-950/50">
          <div className="p-6 text-white">
            <h1 className="text-2xl font-bold">Publicar en varias redes</h1>
            <p className="text-sm">
              Conecta Facebook, Instagram, LinkedIn, YouTube o TikTok primero.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selectedCount = [
    selectedFacebook,
    selectedInstagram,
    selectedLinkedIn,
    selectedYouTube,
    selectedTikTok,
  ].filter(Boolean).length;

  const isCarousel = selectedInstagram && instagramMediaType === "CAROUSEL";
  const busy = publishing || uploadingMedia;

  return (
    <div>
      <div className="flex items-center justify-between bg-zinc-950/50">
        <div className="p-6 text-white">
          <h1 className="text-2xl font-bold">Publicar en varias redes</h1>
          <p className="text-sm">
            Crea el contenido una vez y publícalo en las redes seleccionadas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-2 space-y-5">
          <Card className="bg-zinc-950/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Contenido</CardTitle>
              <CardDescription className="text-white/60">
                Este contenido se adaptará a cada red
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Redes */}
              <div className="space-y-3">
                <div>
                  <Label className="text-white">Redes</Label>
                  <p className="text-xs text-white/50 mt-0.5">
                    Elige al menos una. Solo aparecen las cuentas conectadas.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {facebookAccount && (
                    <div
                      className={cn(
                        "rounded-xl border h-fit border-white/50 p-3 space-y-2",
                        selectedFacebook
                          ? "bg-zinc-950/35 border-yellow-400"
                          : "bg-zinc-950/15",
                        busy && "opacity-60 pointer-events-none",
                      )}
                    >
                      <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={selectedFacebook}
                          onCheckedChange={(c) =>
                            setSelectedFacebook(c === true)
                          }
                          disabled={busy}
                        />
                        <span className="text-sm flex items-center gap-2 text-white font-medium">
                          <img
                            src="/facebook-icon.svg"
                            className="h-6 w-6 rounded-md object-cover"
                            alt="facebook icon"
                          />
                          Facebook
                        </span>
                        <span className="text-xs bg-linear-to-r from-orange-400 to-yellow-500 text-white py-1 px-2 rounded-full truncate ml-auto">
                          {facebookAccount.name}
                        </span>
                      </label>

                      {selectedFacebook && (
                        <div className="space-y-2">
                          <Label className="text-white font-bold">Link:</Label>
                          <Input
                            placeholder="https://ejemplo.com"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            disabled={busy}
                            className="bg-white text-black"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {instagramAccount && (
                    <div
                      className={cn(
                        "rounded-xl border h-fit border-white/50 p-3 space-y-2",
                        selectedInstagram
                          ? "bg-zinc-950/35 border-yellow-400"
                          : "bg-zinc-950/15",
                        busy && "opacity-60 pointer-events-none",
                      )}
                    >
                      <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={selectedInstagram}
                          onCheckedChange={(checked) => {
                            const on = checked === true;
                            setSelectedInstagram(on);
                            if (!on) {
                              setInstagramMediaType("FEED");
                              setImageUrls([]);
                            }
                          }}
                          disabled={busy}
                        />
                        <span className="text-sm flex items-center gap-2 text-white font-medium">
                          <img
                            src="/instagram-icon.svg"
                            className="h-6 w-6 rounded-md object-cover"
                            alt="instagram icon"
                          />
                          Instagram
                        </span>
                        <span className="text-xs bg-linear-to-r from-orange-400 to-yellow-500 text-white py-1 px-2 rounded-full truncate ml-auto">
                          @{instagramAccount.username}
                        </span>
                      </label>
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
                          disabled={busy}
                        >
                          <SelectTrigger className="h-9 bg-white text-black">
                            <SelectValue>
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
                        "flex items-center gap-3 p-3 rounded-xl border h-fit border-white/50 cursor-pointer",
                        selectedLinkedIn
                          ? "bg-zinc-950/35 border-yellow-400"
                          : "bg-zinc-950/15",
                        busy && "opacity-60 pointer-events-none",
                      )}
                    >
                      <Checkbox
                        checked={selectedLinkedIn}
                        onCheckedChange={(c) => setSelectedLinkedIn(c === true)}
                        disabled={busy}
                      />
                      <span className="text-sm flex items-center gap-2 text-white font-medium">
                        <img
                          src="/linkedin.svg"
                          className="h-6 w-6 rounded-md object-cover bg-white"
                          alt="linkedin icon"
                        />
                        LinkedIn
                      </span>
                      <span className="text-xs bg-linear-to-r from-orange-400 to-yellow-500 text-white py-1 px-2 rounded-full truncate ml-auto">
                        {linkedinAccount.name}
                      </span>
                    </label>
                  )}

                  {youtubeAccount && (
                    <div
                      className={cn(
                        "rounded-xl border h-fit border-white/50 p-3 space-y-2",
                        selectedYouTube
                          ? "bg-zinc-950/35 border-yellow-400"
                          : "bg-zinc-950/15",
                        busy && "opacity-60 pointer-events-none",
                      )}
                    >
                      <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={selectedYouTube}
                          onCheckedChange={(c) =>
                            setSelectedYouTube(c === true)
                          }
                          disabled={busy}
                        />
                        <span className="text-sm flex items-center gap-2 text-white font-medium">
                          <img
                            src="/youtube.svg"
                            className="h-6 w-6 rounded-md object-cover"
                            alt="youtube icon"
                          />
                          YouTube
                        </span>
                        <span className="text-xs bg-linear-to-r from-orange-400 to-yellow-500 text-white py-1 px-2 rounded-full truncate ml-auto">
                          {youtubeAccount.name || "Canal"}
                        </span>
                      </label>
                      {selectedYouTube && (
                        <div className="grid gap-2">
                          <Input
                            placeholder="Título del video"
                            value={youtubeTitle}
                            onChange={(e) => setYoutubeTitle(e.target.value)}
                            maxLength={100}
                            className="bg-white text-black"
                            disabled={busy}
                          />
                          <Select
                            value={youtubePrivacy}
                            onValueChange={(v) =>
                              setYoutubePrivacy(
                                v as "public" | "unlisted" | "private",
                              )
                            }
                            disabled={busy}
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
                                <SelectItem key={o.value} value={o.value}>
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
                        "rounded-xl border h-fit border-white/50 p-3 space-y-2",
                        selectedTikTok
                          ? "bg-zinc-950/35 border-yellow-400"
                          : "bg-zinc-950/15",
                        busy && "opacity-60 pointer-events-none",
                      )}
                    >
                      <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={selectedTikTok}
                          onCheckedChange={(c) => setSelectedTikTok(c === true)}
                          disabled={busy}
                        />
                        <span className="text-sm flex items-center gap-2 text-white font-medium">
                          <img
                            src="/tiktok.svg"
                            className="h-6 w-6 rounded-md object-cover"
                            alt="tiktok icon"
                          />
                          TikTok
                        </span>
                        <span className="text-xs bg-linear-to-r from-orange-400 to-yellow-500 text-white py-1 px-2 rounded-full truncate ml-auto">
                          {tiktokAccount.name || tiktokAccount.username}
                        </span>
                      </label>

                      {selectedTikTok && (
                        <div className="space-y-3 pl-1 border-l-2 border-white/10 ml-1">
                          <div className="space-y-1.5">
                            <Label className="text-white/80 text-xs">
                              Visibilidad
                            </Label>
                            <Select
                              value={tiktokPrivacy}
                              onValueChange={(v) =>
                                setTiktokPrivacy(v as TikTokPrivacy)
                              }
                              disabled={busy}
                            >
                              <SelectTrigger className="bg-white text-black max-w-xs">
                                <SelectValue placeholder="Visibilidad">
                                  {
                                    TIKTOK_PRIVACY_OPTIONS.find(
                                      (o) => o.value === tiktokPrivacy,
                                    )?.label
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {TIKTOK_PRIVACY_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

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
                                disabled={busy}
                              />
                              Permitir comentarios
                            </label>
                            <label className="flex items-center gap-2 text-sm text-white/90 cursor-pointer">
                              <Checkbox
                                checked={tiktokAllowDuet}
                                onCheckedChange={(c) =>
                                  setTiktokAllowDuet(c === true)
                                }
                                disabled={busy}
                              />
                              Permitir Duet
                            </label>
                            <label className="flex items-center gap-2 text-sm text-white/90 cursor-pointer">
                              <Checkbox
                                checked={tiktokAllowStitch}
                                onCheckedChange={(c) =>
                                  setTiktokAllowStitch(c === true)
                                }
                                disabled={busy}
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
                              disabled={busy}
                            />
                            <span className="text-sm text-white/90 leading-snug">
                              Contenido promocional / comercial
                              <span className="block text-xs text-white/45">
                                Actívalo si el video promociona una marca o
                                producto
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
                                  disabled={busy}
                                />
                                Promociona tu propia marca
                              </label>
                              <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                                <Checkbox
                                  checked={tiktokBrandContent}
                                  onCheckedChange={(c) =>
                                    setTiktokBrandContent(c === true)
                                  }
                                  disabled={busy}
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
              </div>

              {!(selectedInstagram && instagramMediaType === "STORIES") && (
                <div className="flex flex-col lg:flex-row justify-between gap-2 bg-zinc-950/50 text-white rounded">
                  <AICaptionGenerator
                    platform="general"
                    onGenerate={(caption) => setMessage(caption)}
                  />
                  <Separator
                    orientation="vertical"
                    className="hidden lg:block"
                  />
                  <div className="flex flex-col w-full gap-2 p-4">
                    <span>Texto / Caption</span>
                    <Textarea
                      placeholder="Escribe tu publicación..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      className="resize-none bg-white flex-1 text-black"
                      disabled={busy}
                    />
                  </div>
                </div>
              )}

              {selectedInstagram && instagramMediaType === "STORIES" && (
                <p className="text-sm text-amber-100 bg-amber-500/10 border border-amber-500/30 p-3 rounded">
                  Las Historias de Instagram no permiten texto por la API.
                </p>
              )}

              {(selectedYouTube || selectedTikTok) && !videoUrl && (
                <p className="text-sm text-amber-200">
                  YouTube y TikTok requieren un video.
                </p>
              )}

              {isCarousel && (
                <p className="text-sm text-amber-200">
                  Carrusel IG: {imageUrls.length}/10 (mín. 2). Otras redes
                  usarán la primera imagen si aplica.
                </p>
              )}

              <div className="flex flex-col lg:flex-row justify-between gap-2 bg-zinc-950/50 text-white rounded">
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
                <Separator orientation="vertical" className="hidden lg:block" />
                <div className="flex w-full flex-col gap-2 p-4">
                  <span>Media</span>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <input
                      type="file"
                      accept="image/*"
                      multiple={isCarousel}
                      ref={imageInputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={busy}
                    />
                    <input
                      type="file"
                      accept="video/*"
                      ref={videoInputRef}
                      onChange={handleVideoUpload}
                      className="hidden"
                      disabled={busy || isCarousel}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-black"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={busy || (!!videoUrl && !isCarousel)}
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      {isCarousel ? "Añadir imágenes" : "Imagen"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-black"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={
                        busy || isCarousel || !!imageUrl || imageUrls.length > 0
                      }
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Video
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="text-black"
                      onClick={() => setLibraryOpen(true)}
                      disabled={busy}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Biblioteca
                    </Button>
                  </div>

                  <div className="flex-1 flex items-center justify-center">
                    {isCarousel && imageUrls.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto py-2 w-full">
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
                              disabled={busy}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      (imageUrl || videoUrl) && (
                        <div className="relative rounded-lg overflow-hidden border bg-muted/30">
                          {imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
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
                            disabled={busy}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
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
            </CardContent>
          </Card>
        </div>

        <div className="sticky top-6 z-10 self-start space-y-5 w-full">
          <PostPreview
            platform="linkedin"
            message={message}
            imageUrl={isCarousel ? imageUrls[0] || null : imageUrl}
            videoUrl={videoUrl}
          />
          <Button
            className="w-full h-12 text-base font-semibold rounded-xl bg-linear-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white shadow-lg shadow-orange-500/25"
            size="lg"
            onClick={handlePublish}
            disabled={!canEdit || !companyId || busy || selectedCount === 0}
          >
            {uploadingMedia ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : publishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              `Publicar en ${selectedCount} red${selectedCount !== 1 ? "es" : ""}`
            )}
          </Button>

          {results.length > 0 && (
            <div className="space-y-2 rounded-xl border border-white/15 bg-zinc-950/60 p-3">
              <p className="text-xs font-medium text-white/60 px-1">
                Estado por red
              </p>
              {results.map((r) => (
                <div
                  key={r.platformKey}
                  className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5"
                >
                  <img
                    src={PLATFORM_ICONS[r.platformKey]}
                    alt=""
                    className={cn(
                      "h-7 w-7 rounded-md object-cover shrink-0",
                      r.platformKey === "linkedin" && "bg-white",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      {r.platform}
                    </p>
                    <p
                      className={cn(
                        "text-xs truncate flex gap-2 items-center",
                        r.success === null && "text-white/50",
                        r.success === true && "text-green-400",
                        r.success === false && "text-red-400",
                      )}
                    >
                      {r.message}
                      {r.success === true && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {r.success === false && (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                    </p>
                  </div>

                  {r.success === null && (
                    <Loader2 className="h-5 w-5 animate-spin text-yellow-400 shrink-0" />
                  )}
                  {r.success === true && (
                    <div className="flex items-center gap-2 shrink-0">
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-yellow-400 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
