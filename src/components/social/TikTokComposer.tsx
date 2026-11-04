"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PostPreview } from "@/components/social/PostPreview";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/useAuthStore";
import { saveMediaToLibrary } from "@/lib/media";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";

export const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Público (Everyone)",
  MUTUAL_FOLLOW_FRIENDS: "Amigos",
  FOLLOWER_OF_CREATOR: "Seguidores",
  SELF_ONLY: "Solo yo",
};

export type TikTokPrivacy = string;

interface CreatorInfo {
  creator_nickname?: string;
  creator_username?: string;
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
}

interface Props {
  accountName: string;
  openId?: string | null;
  loading?: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  videoUrl: string | null;
  onVideoChange: (url: string | null) => void;
  /** Vacío hasta que el usuario elija (requisito TikTok) */
  privacyLevel: string;
  onPrivacyChange: (value: string) => void;
  onPublish: (meta: {
    privacyLevel: string;
    disableComment: boolean;
    disableDuet: boolean;
    disableStitch: boolean;
    brandContentToggle: boolean;
    brandOrganicToggle: boolean;
    commercialDisclosure: boolean;
  }) => Promise<void>;
  forcePrivate?: boolean;
}

export function TikTokComposer({
  accountName,
  openId,
  loading = false,
  title,
  onTitleChange,
  videoUrl,
  onVideoChange,
  privacyLevel,
  onPrivacyChange,
  onPublish,
  forcePrivate = false,
}: Props) {
  const companyId = useAuthStore((s) => s.companyId);
  const user = useAuthStore((s) => s.user);

  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [creator, setCreator] = useState<CreatorInfo | null>(null);

  // Interacciones: OFF por defecto (TikTok)
  const [allowComment, setAllowComment] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);

  // Comercial: OFF por defecto
  const [commercialOn, setCommercialOn] = useState(false);
  const [yourBrand, setYourBrand] = useState(false);
  const [brandedContent, setBrandedContent] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const MAX_VIDEO_SIZE = 256 * 1024 * 1024;

  const privacyOptions = creator?.privacy_level_options?.length
    ? creator.privacy_level_options
    : forcePrivate
      ? ["SELF_ONLY"]
      : ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"];

  const commentLocked = !!creator?.comment_disabled;
  const duetLocked = !!creator?.duet_disabled;
  const stitchLocked = !!creator?.stitch_disabled;

  const displayName =
    creator?.creator_nickname || creator?.creator_username || accountName;

  // Cargar creator_info al montar
  useEffect(() => {
    const load = async () => {
      if (!companyId) {
        setCreatorLoading(false);
        return;
      }
      try {
        setCreatorLoading(true);
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/tiktok/creator-info", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ companyId, openId }),
        });
        const data = await res.json();
        if (res.ok && data.creator) {
          setCreator(data.creator);
        }
      } catch (e) {
        console.warn("creator_info", e);
      } finally {
        setCreatorLoading(false);
      }
    };
    load();
  }, [companyId, openId]);

  // Si branded content, no permitir Solo yo
  useEffect(() => {
    if (brandedContent && privacyLevel === "SELF_ONLY") {
      onPrivacyChange("");
      toast.message("Branded content no puede ser 'Solo yo'");
    }
  }, [brandedContent, privacyLevel, onPrivacyChange]);

  const commercialOk = !commercialOn || yourBrand || brandedContent;

  const canPublish =
    !!title.trim() &&
    !!videoUrl &&
    !!privacyLevel &&
    commercialOk &&
    !uploading &&
    !loading;

  const disclaimer = (() => {
    if (!commercialOn || (yourBrand && !brandedContent)) {
      return (
        <>
          By posting, you agree to TikTok&apos;s{" "}
          <a
            href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Music Usage Confirmation
          </a>
          .
        </>
      );
    }
    return (
      <>
        By posting, you agree to TikTok&apos;s{" "}
        <a
          href="https://www.tiktok.com/legal/page/global/bc-policy/en"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Branded Content Policy
        </a>{" "}
        and{" "}
        <a
          href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Music Usage Confirmation
        </a>
        .
      </>
    );
  })();

  const labelHint = (() => {
    if (!commercialOn) return null;
    if (yourBrand && brandedContent) {
      return "Your photo/video will be labeled as 'Paid partnership'";
    }
    if (brandedContent) {
      return "Your photo/video will be labeled as 'Paid partnership'";
    }
    if (yourBrand) {
      return "Your photo/video will be labeled as 'Promotional content'";
    }
    return "You need to indicate if your content promotes yourself, a third party, or both.";
  })();

  const uploadToR2 = async (file: File) => {
    if (!companyId) throw new Error("No hay empresa asociada");

    const signRes = await fetch("/api/upload/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        platform: "tiktok",
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
      headers: { "Content-Type": file.type || "video/mp4" },
      body: file,
    });
    if (!putRes.ok) throw new Error("Error al subir el video");

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
        console.warn(e);
      }
    }
    return publicUrl as string;
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Selecciona un video");
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error("Video demasiado grande");
      return;
    }
    const tid = toast.loading("Subiendo video…");
    try {
      setUploading(true);
      onVideoChange(await uploadToR2(file));
      toast.success("Video listo", { id: tid });
    } catch (err: any) {
      toast.error(err.message || "Error al subir", { id: tid });
    } finally {
      setUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!canPublish) {
      if (commercialOn && !yourBrand && !brandedContent) {
        toast.error("Indica si promocionas tu marca, un tercero, o ambos");
      } else if (!privacyLevel) {
        toast.error("Elige la visibilidad del post");
      }
      return;
    }

    await onPublish({
      privacyLevel,
      disableComment: commentLocked || !allowComment,
      disableDuet: duetLocked || !allowDuet,
      disableStitch: stitchLocked || !allowStitch,
      brandContentToggle: commercialOn && brandedContent,
      brandOrganicToggle: commercialOn && yourBrand,
      commercialDisclosure: commercialOn,
    });
  };

  const isLoading = loading || uploading || creatorLoading;
  const titleCount = title.length;
  const isTitleOver = titleCount > 2200;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="bg-zinc-950/60">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-white">Publicar en TikTok</CardTitle>
                <CardDescription className="text-white/50">
                  Se publicará en:{" "}
                  <span className="text-white font-medium">
                    {creatorLoading ? "…" : displayName}
                  </span>
                  {creator?.creator_username
                    ? ` (@${creator.creator_username})`
                    : ""}
                </CardDescription>
              </div>
              <Badge variant="secondary">TikTok</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {forcePrivate && (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
                App aún sin audit de Direct Post: TikTok puede limitar la
                visibilidad a <strong>Solo yo</strong>.
              </p>
            )}

            {/* Caption */}
            <div className="flex flex-col sm:flex-row gap-2 bg-zinc-950/50 text-white rounded p-2">
              <AICaptionGenerator
                platform="general"
                onGenerate={(c) => onTitleChange(c)}
              />
              <Separator orientation="vertical" className="hidden sm:block" />
              <div className="flex flex-col w-full gap-2 p-2">
                <Label htmlFor="tt-title">Caption / título (editable)</Label>
                <Textarea
                  id="tt-title"
                  placeholder="Texto del video, hashtags..."
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  rows={4}
                  className="resize-none bg-white text-black"
                  disabled={isLoading}
                />
                <p
                  className={cn(
                    "text-xs text-right",
                    isTitleOver ? "text-red-500" : "text-white/50",
                  )}
                >
                  {titleCount}/2200
                </p>
              </div>
            </div>

            {/* Privacy — sin valor por defecto */}
            <div className="space-y-2">
              <Label className="text-white">Visibilidad *</Label>
              <Select
                value={privacyLevel || undefined}
                onValueChange={(v) => {
                  if (v == null) return;
                  if (brandedContent && v === "SELF_ONLY") {
                    toast.error(
                      "Branded content visibility cannot be set to private.",
                    );
                    return;
                  }
                  onPrivacyChange(v);
                }}
                disabled={isLoading}
              >
                <SelectTrigger className="bg-white max-w-md text-black">
                  <SelectValue placeholder="Selecciona visibilidad (obligatorio)" />
                </SelectTrigger>
                <SelectContent>
                  {privacyOptions.map((value) => {
                    const blocked = brandedContent && value === "SELF_ONLY";
                    return (
                      <SelectItem key={value} value={value} disabled={blocked}>
                        {PRIVACY_LABELS[value] || value}
                        {blocked ? " (no disponible con branded content)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Interactions — off by default */}
            <div className="space-y-3 rounded-lg border border-white/10 p-4">
              <Label className="text-white">Interacciones</Label>
              <p className="text-xs text-white/50">
                Desactivadas por defecto. Actívalas manualmente si quieres
                permitirlas.
              </p>
              <div className="flex flex-col gap-3">
                <label
                  className={cn(
                    "flex items-center gap-2 text-sm text-white",
                    commentLocked && "opacity-40",
                  )}
                >
                  <Checkbox
                    checked={allowComment && !commentLocked}
                    disabled={isLoading || commentLocked}
                    onCheckedChange={(c) => setAllowComment(c === true)}
                  />
                  Permitir comentarios
                  {commentLocked && (
                    <span className="text-xs text-white/40">
                      (desactivado en la cuenta)
                    </span>
                  )}
                </label>
                <label
                  className={cn(
                    "flex items-center gap-2 text-sm text-white",
                    duetLocked && "opacity-40",
                  )}
                >
                  <Checkbox
                    checked={allowDuet && !duetLocked}
                    disabled={isLoading || duetLocked}
                    onCheckedChange={(c) => setAllowDuet(c === true)}
                  />
                  Permitir Duet
                  {duetLocked && (
                    <span className="text-xs text-white/40">
                      (desactivado en la cuenta)
                    </span>
                  )}
                </label>
                <label
                  className={cn(
                    "flex items-center gap-2 text-sm text-white",
                    stitchLocked && "opacity-40",
                  )}
                >
                  <Checkbox
                    checked={allowStitch && !stitchLocked}
                    disabled={isLoading || stitchLocked}
                    onCheckedChange={(c) => setAllowStitch(c === true)}
                  />
                  Permitir Stitch
                  {stitchLocked && (
                    <span className="text-xs text-white/40">
                      (desactivado en la cuenta)
                    </span>
                  )}
                </label>
              </div>
            </div>

            {/* Commercial disclosure — Point 3 */}
            <div className="space-y-3 rounded-lg border border-white/10 p-4">
              <label className="flex items-center gap-2 text-sm text-white">
                <Checkbox
                  checked={commercialOn}
                  disabled={isLoading}
                  onCheckedChange={(c) => {
                    const on = c === true;
                    setCommercialOn(on);
                    if (!on) {
                      setYourBrand(false);
                      setBrandedContent(false);
                    }
                  }}
                />
                This content promotes myself, a brand, product or service
              </label>

              {commercialOn && (
                <div className="ml-6 space-y-3">
                  <label className="flex items-center gap-2 text-sm text-white">
                    <Checkbox
                      checked={yourBrand}
                      disabled={isLoading}
                      onCheckedChange={(c) => setYourBrand(c === true)}
                    />
                    Your brand (Brand Organic)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white">
                    <Checkbox
                      checked={brandedContent}
                      disabled={isLoading}
                      onCheckedChange={(c) => setBrandedContent(c === true)}
                    />
                    Branded content (third party)
                  </label>
                  {labelHint && (
                    <p
                      className={cn(
                        "text-xs rounded-md p-2",
                        yourBrand || brandedContent
                          ? "bg-white/10 text-white/80"
                          : "bg-amber-500/20 text-amber-100",
                      )}
                    >
                      {labelHint}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Video */}
            <div className="space-y-3 p-4 bg-zinc-950/50 rounded">
              <Label className="text-white">Video</Label>
              <p className="text-xs text-white/50">
                MP4 · máx. {Math.floor(MAX_VIDEO_SIZE / (1024 * 1024))}MB
                {creator?.max_video_post_duration_sec
                  ? ` · duración máx. cuenta: ${creator.max_video_post_duration_sec}s`
                  : ""}
              </p>
              <input
                type="file"
                accept="video/mp4,video/quicktime"
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
                    onClick={() => {
                      onVideoChange(null);
                      if (videoInputRef.current)
                        videoInputRef.current.value = "";
                    }}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Point 4 + 2 NOTE — disclaimer */}
            <p className="text-xs text-white/60 leading-relaxed">
              {disclaimer}
            </p>
            <p className="text-xs text-white/40">
              After publishing, it may take a few minutes for the content to
              process and appear on the TikTok profile.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="sticky top-6 z-10 self-start flex flex-col gap-4 w-full">
        <PostPreview
          platform="tiktok"
          accountName={displayName}
          message={title}
          videoUrl={videoUrl}
        />
        <Button
          className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-orange-400 to-yellow-500 text-white"
          onClick={handleSubmit}
          disabled={!canPublish || isTitleOver || !companyId}
          title={
            commercialOn && !yourBrand && !brandedContent
              ? "You need to indicate if your content promotes yourself, a third party, or both."
              : undefined
          }
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {uploading ? "Subiendo..." : "Publicando..."}
            </>
          ) : (
            "Publicar en TikTok"
          )}
        </Button>
      </div>

      <MediaLibraryPicker
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        accept="video"
        onSelect={(item) => {
          if (item.type !== "video") {
            toast.error("Solo video");
            return;
          }
          onVideoChange(item.url);
        }}
      />
    </div>
  );
}
