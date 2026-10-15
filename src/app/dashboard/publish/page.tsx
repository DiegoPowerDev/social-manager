"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
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
  success: boolean;
  message: string;
}

type IgMediaType = "FEED" | "REELS" | "STORIES" | "CAROUSEL";

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
      } catch (error) {
        console.error(error);
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
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error al subir el archivo");
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

  const onLibrarySelect = (item: { url: string; type: "image" | "video" }) => {
    if (item.type === "video") {
      setImageUrl(null);
      setImageUrls([]);
      setVideoUrl(item.url);
      return;
    }
    setVideoUrl(null);
    if (selectedInstagram && instagramMediaType === "CAROUSEL") {
      if (imageUrls.length >= 10) {
        alert("Máximo 10 imágenes en el carrusel");
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

    const isCarousel = selectedInstagram && instagramMediaType === "CAROUSEL";

    try {
      setUploadingMedia(true);
      setVideoUrl(null);

      if (isCarousel) {
        const list = Array.from(files);
        if (imageUrls.length + list.length > 10) {
          alert("Máximo 10 imágenes en el carrusel");
          return;
        }
        const uploaded: string[] = [];
        for (const file of list) {
          if (file.size > 10 * 1024 * 1024) {
            alert(`"${file.name}" supera 10MB`);
            continue;
          }
          uploaded.push(await uploadToR2(file));
        }
        const next = [...imageUrls, ...uploaded].slice(0, 10);
        setImageUrls(next);
        setImageUrl(next[0] || null);
      } else {
        const file = files[0];
        if (file.size > 10 * 1024 * 1024) {
          alert("La imagen no puede superar los 10MB");
          return;
        }
        const url = await uploadToR2(file);
        setImageUrls([]);
        setImageUrl(url);
      }
    } catch (err: any) {
      alert(err.message || "Error al subir la imagen");
    } finally {
      setUploadingMedia(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      alert("El video no puede superar los 100MB");
      return;
    }

    try {
      setUploadingMedia(true);
      setImageUrl(null);
      setImageUrls([]);
      const url = await uploadToR2(file);
      setVideoUrl(url);
    } catch (err: any) {
      alert(err.message || "Error al subir el video");
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
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handlePublish = async () => {
    if (!companyId || !canEdit) {
      alert(!canEdit ? "No tienes permiso para publicar" : "Sin empresa");
      return;
    }
    if (
      !selectedFacebook &&
      !selectedInstagram &&
      !selectedLinkedIn &&
      !selectedYouTube &&
      !selectedTikTok
    ) {
      alert("Selecciona al menos una red");
      return;
    }

    if ((selectedYouTube || selectedTikTok) && !videoUrl) {
      alert("YouTube y TikTok requieren un video");
      return;
    }

    if (selectedYouTube && !youtubeTitle.trim() && !message.trim()) {
      alert("YouTube requiere un título");
      return;
    }

    if (selectedInstagram) {
      if (instagramMediaType === "CAROUSEL" && imageUrls.length < 2) {
        alert("El carrusel de Instagram necesita al menos 2 imágenes");
        return;
      }
      if (instagramMediaType === "REELS" && !videoUrl) {
        alert("Los Reels requieren un video");
        return;
      }
      if (
        instagramMediaType !== "CAROUSEL" &&
        instagramMediaType !== "REELS" &&
        !imageUrl &&
        !videoUrl
      ) {
        alert("Instagram requiere una imagen o un video");
        return;
      }
    }

    setPublishing(true);
    setResults([]);

    const publishResults: PublishResult[] = [];

    if (selectedFacebook && facebookAccount) {
      try {
        const res = await fetch("/api/publish/facebook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        publishResults.push({
          platform: "Facebook",
          success: res.ok,
          message: res.ok ? "Publicado correctamente" : data.error || "Error",
        });
      } catch (err: any) {
        publishResults.push({
          platform: "Facebook",
          success: false,
          message: err.message || "Error de conexión",
        });
      }
    }

    if (selectedInstagram && instagramAccount) {
      try {
        const res = await fetch("/api/publish/instagram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        publishResults.push({
          platform: "Instagram",
          success: res.ok,
          message: res.ok
            ? instagramMediaType === "STORIES"
              ? "Historia publicada (sin texto)"
              : instagramMediaType === "CAROUSEL"
                ? "Carrusel publicado"
                : "Publicado correctamente"
            : data.error || "Error",
        });
      } catch (err: any) {
        publishResults.push({
          platform: "Instagram",
          success: false,
          message: err.message || "Error de conexión",
        });
      }
    }

    if (selectedLinkedIn && linkedinAccount) {
      try {
        const res = await fetch("/api/publish/linkedin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        publishResults.push({
          platform: "LinkedIn",
          success: res.ok,
          message: res.ok ? "Publicado correctamente" : data.error || "Error",
        });
      } catch (err: any) {
        publishResults.push({
          platform: "LinkedIn",
          success: false,
          message: err.message || "Error de conexión",
        });
      }
    }

    if (selectedYouTube && youtubeAccount) {
      try {
        const res = await fetch("/api/publish/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        publishResults.push({
          platform: "YouTube",
          success: res.ok,
          message: res.ok ? "Video publicado" : data.error || "Error",
        });
      } catch (err: any) {
        publishResults.push({
          platform: "YouTube",
          success: false,
          message: err.message || "Error de conexión",
        });
      }
    }

    if (selectedTikTok && tiktokAccount) {
      try {
        const res = await fetch("/api/publish/tiktok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            accessToken: tiktokAccount.accessToken,
            openId: tiktokAccount.openId,
            name: tiktokAccount.name || tiktokAccount.username,
            title: message.trim() || "Video",
            videoUrl,
            privacyLevel: "SELF_ONLY",
          }),
        });
        const data = await res.json();
        publishResults.push({
          platform: "TikTok",
          success: res.ok,
          message: res.ok ? "Video enviado a TikTok" : data.error || "Error",
        });
      } catch (err: any) {
        publishResults.push({
          platform: "TikTok",
          success: false,
          message: err.message || "Error de conexión",
        });
      }
    }

    setResults(publishResults);
    setPublishing(false);

    if (publishResults.every((r) => r.success)) {
      clearForm();
    }
  };

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
        <div className="flex items-center justify-between bg-zinc-950/50 backdrop-blur">
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

  return (
    <div>
      <div className="flex items-center justify-between bg-zinc-950/50 backdrop-blur">
        <div className="p-6 text-white">
          <h1 className="text-2xl font-bold">Publicar en varias redes</h1>
          <p className="text-sm">
            Crea el contenido una vez y publícalo en las redes seleccionadas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-2 space-y-5">
          <Card className="bg-zinc-950/50">
            <CardHeader>
              <CardTitle className="text-white">Contenido</CardTitle>
              <CardDescription className="text-white/60">
                Este contenido se adaptará a cada red
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Card className="bg-zinc-950/60 text-white">
                <CardHeader>
                  <CardTitle>Redes</CardTitle>
                  <CardDescription>Selecciona dónde publicar</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {facebookAccount && (
                    <div className="flex items-start space-x-3 p-3 rounded-lg">
                      <Checkbox
                        id="fb"
                        checked={selectedFacebook}
                        onCheckedChange={(c) => setSelectedFacebook(c === true)}
                        disabled={publishing}
                      />
                      <div className="space-y-1">
                        <Label
                          htmlFor="fb"
                          className="font-medium cursor-pointer"
                        >
                          Facebook
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {facebookAccount.name}
                        </p>
                      </div>
                    </div>
                  )}

                  {instagramAccount && (
                    <div className="space-y-3 p-3 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="ig"
                          checked={selectedInstagram}
                          onCheckedChange={(checked) => {
                            const on = checked === true;
                            setSelectedInstagram(on);
                            if (!on) {
                              setInstagramMediaType("FEED");
                              setImageUrls([]);
                            }
                          }}
                          disabled={publishing}
                        />
                        <div className="space-y-1 flex-1">
                          <Label
                            htmlFor="ig"
                            className="font-medium cursor-pointer"
                          >
                            Instagram
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            @{instagramAccount.username}
                          </p>
                        </div>
                      </div>

                      {selectedInstagram && (
                        <div className="ml-7 space-y-2">
                          <Label className="text-xs">Tipo</Label>
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
                            disabled={publishing}
                          >
                            <SelectTrigger className="h-8 bg-black">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FEED">Feed</SelectItem>
                              <SelectItem value="CAROUSEL">Carrusel</SelectItem>
                              <SelectItem value="REELS">Reel</SelectItem>
                              <SelectItem value="STORIES">Historia</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  {linkedinAccount && (
                    <div className="flex items-start space-x-3 p-3 rounded-lg">
                      <Checkbox
                        id="li"
                        checked={selectedLinkedIn}
                        onCheckedChange={(c) => setSelectedLinkedIn(c === true)}
                        disabled={publishing}
                      />
                      <div className="space-y-1">
                        <Label
                          htmlFor="li"
                          className="font-medium cursor-pointer"
                        >
                          LinkedIn
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {linkedinAccount.name}
                        </p>
                      </div>
                    </div>
                  )}

                  {youtubeAccount && (
                    <div className="flex items-start space-x-3 p-3 rounded-lg">
                      <Checkbox
                        id="yt"
                        checked={selectedYouTube}
                        onCheckedChange={(c) => setSelectedYouTube(c === true)}
                        disabled={publishing}
                      />
                      <div className="space-y-1">
                        <Label
                          htmlFor="yt"
                          className="font-medium cursor-pointer"
                        >
                          YouTube
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {youtubeAccount.name || "Canal"}
                        </p>
                      </div>
                    </div>
                  )}

                  {tiktokAccount && (
                    <div className="flex items-start space-x-3 p-3 rounded-lg">
                      <Checkbox
                        id="tt"
                        checked={selectedTikTok}
                        onCheckedChange={(c) => setSelectedTikTok(c === true)}
                        disabled={publishing}
                      />
                      <div className="space-y-1">
                        <Label
                          htmlFor="tt"
                          className="font-medium cursor-pointer"
                        >
                          TikTok
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {tiktokAccount.name || tiktokAccount.username}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedYouTube && (
                <div className="space-y-2">
                  <Label className="text-white">Título YouTube</Label>
                  <Input
                    value={youtubeTitle}
                    onChange={(e) => setYoutubeTitle(e.target.value)}
                    maxLength={100}
                    className="bg-white text-black"
                    disabled={publishing}
                  />
                  <Select
                    value={youtubePrivacy}
                    onValueChange={(v) => setYoutubePrivacy(v as any)}
                  >
                    <SelectTrigger className="bg-black text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Público</SelectItem>
                      <SelectItem value="unlisted">No listado</SelectItem>
                      <SelectItem value="private">Privado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!(selectedInstagram && instagramMediaType === "STORIES") && (
                <div className="flex justify-between gap-2 bg-zinc-950/50 text-white rounded">
                  <AICaptionGenerator
                    platform="general"
                    onGenerate={(caption) => setMessage(caption)}
                  />
                  <Separator orientation="vertical" />
                  <div className="flex flex-col w-full gap-2 p-4">
                    <span>Texto / Caption</span>
                    <Textarea
                      placeholder="Escribe tu publicación..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      className="resize-none flex-1 text-black"
                      disabled={publishing || uploadingMedia}
                    />
                  </div>
                </div>
              )}

              {selectedInstagram && instagramMediaType === "STORIES" && (
                <p className="text-sm text-black bg-white/60 p-3 rounded">
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
                      disabled={publishing || uploadingMedia}
                    />
                    <input
                      type="file"
                      accept="video/*"
                      ref={videoInputRef}
                      onChange={handleVideoUpload}
                      className="hidden"
                      disabled={publishing || uploadingMedia || isCarousel}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-black"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={
                        publishing ||
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
                      className="text-black"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={
                        publishing ||
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
                      className="text-black"
                      onClick={() => setLibraryOpen(true)}
                      disabled={publishing || uploadingMedia}
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
                              disabled={publishing || uploadingMedia}
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
                            disabled={publishing || uploadingMedia}
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

              <div className="space-y-2">
                <Label className="text-white font-bold">
                  Enlace (solo Facebook)
                </Label>
                <Input
                  placeholder="https://ejemplo.com"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  disabled={publishing || uploadingMedia}
                  className="bg-white text-black"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <PostPreview
            platform="linkedin"
            message={message}
            imageUrl={isCarousel ? imageUrls[0] || null : imageUrl}
            videoUrl={videoUrl}
          />
          <Button
            className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white shadow-lg shadow-orange-500/25"
            size="lg"
            onClick={handlePublish}
            disabled={
              !canEdit ||
              !companyId ||
              publishing ||
              uploadingMedia ||
              selectedCount === 0
            }
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
            <Card className="bg-white/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resultados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.map((result) => (
                  <div
                    key={result.platform}
                    className="flex items-start gap-2 text-sm"
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <span className="font-medium">{result.platform}: </span>
                      <span
                        className={
                          result.success ? "text-green-700" : "text-red-700"
                        }
                      >
                        {result.message}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <MediaLibraryPicker
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        accept={
          instagramMediaType === "REELS"
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
