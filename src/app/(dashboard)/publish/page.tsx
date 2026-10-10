"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
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
import TitleComponent from "@/components/layout/titleComponent";

interface SocialAccount {
  id: string;
  platform: "facebook" | "instagram" | "linkedin";
  name?: string;
  username?: string;
  pageId?: string;
  igUserId?: string;
  personId?: string;
  accessToken: string;
}

interface PublishResult {
  platform: string;
  success: boolean;
  message: string;
}

export default function BulkPublishPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const companyId = useAuthStore((s) => s.companyId);
  const memberRole = useAuthStore((s) => s.memberRole);
  const canEdit = memberRole === "admin" || memberRole === "editor";

  // Contenido
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [link, setLink] = useState("");

  // Selección de redes
  const [selectedFacebook, setSelectedFacebook] = useState(false);
  const [selectedInstagram, setSelectedInstagram] = useState(false);
  const [selectedLinkedIn, setSelectedLinkedIn] = useState(false);
  const [instagramMediaType, setInstagramMediaType] = useState<
    "FEED" | "REELS" | "STORIES"
  >("FEED");

  // Estados de carga
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
    return data.publicUrl as string;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("La imagen no puede superar los 10MB");
      return;
    }

    try {
      setUploadingMedia(true);
      setVideoUrl(null);
      const url = await uploadToR2(file);
      setImageUrl(url);
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
    setVideoUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const clearForm = () => {
    setMessage("");
    setImageUrl(null);
    setVideoUrl(null);
    setLink("");
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handlePublish = async () => {
    if (!companyId || !canEdit) {
      alert(!canEdit ? "No tienes permiso para publicar" : "Sin empresa");
      return;
    }
    if (!selectedFacebook && !selectedInstagram && !selectedLinkedIn) {
      alert("Selecciona al menos una red");
      return;
    }

    if (selectedInstagram && !imageUrl && !videoUrl) {
      alert("Instagram requiere una imagen o un video");
      return;
    }

    if (selectedInstagram && instagramMediaType === "REELS" && !videoUrl) {
      alert("Los Reels requieren un video");
      return;
    }

    setPublishing(true);
    setResults([]);

    const publishResults: PublishResult[] = [];

    // Facebook
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

    // Instagram
    if (selectedInstagram && instagramAccount) {
      try {
        const res = await fetch("/api/publish/instagram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            igUserId: instagramAccount.igUserId,
            accessToken: instagramAccount.accessToken,
            username: instagramAccount.username,
            caption: instagramMediaType === "STORIES" ? undefined : message,
            imageUrl: imageUrl || undefined,
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
              ? "Historia publicada (sin texto, limitación de Instagram)"
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

    // LinkedIn
    if (selectedLinkedIn && linkedinAccount) {
      try {
        const res = await fetch("/api/publish/linkedin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personId: linkedinAccount.personId,
            accessToken: linkedinAccount.accessToken,
            name: linkedinAccount.name,
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

    setResults(publishResults);
    setPublishing(false);

    const allSuccess = publishResults.every((r) => r.success);
    if (allSuccess) {
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
      <div className="flex-1  flex  flex-col h-full w-full">
        <TitleComponent
          title="Publicar en varias redes"
          description="No tienes ninguna red conectada. Conecta Facebook, Instagram o
          LinkedIn primero."
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white">
            ¡No pierdas tiempo, empieza a añadir tus redes!
          </div>
        </div>
      </div>
    );
  }

  const selectedCount = [
    selectedFacebook,
    selectedInstagram,
    selectedLinkedIn,
  ].filter(Boolean).length;

  return (
    <div className="">
      <TitleComponent
        title="Publicar en varias redes"
        description="Crea el contenido una vez y publícalo en todas las redes seleccionadas"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Contenido */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="bg-white/70">
            <CardHeader>
              <CardTitle>Contenido</CardTitle>
              <CardDescription>
                Este contenido se adaptará a cada red
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Redes</CardTitle>
                  <CardDescription>Selecciona dónde publicar</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-3">
                  {facebookAccount && (
                    <div className="flex items-start space-x-3 p-3 rounded-lg bg-white/60">
                      <Checkbox
                        id="fb"
                        checked={selectedFacebook}
                        onCheckedChange={(checked) =>
                          setSelectedFacebook(checked === true)
                        }
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
                    <div className="space-y-3 p-3 rounded-lg bg-white/60">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="ig"
                          checked={selectedInstagram}
                          onCheckedChange={(checked) => {
                            const on = checked === true;
                            setSelectedInstagram(on);
                            if (!on) setInstagramMediaType("FEED");
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
                          <Label className="text-xs">Tipo de publicación</Label>
                          <Select
                            value={instagramMediaType}
                            onValueChange={(v) =>
                              setInstagramMediaType(v as any)
                            }
                            disabled={publishing}
                          >
                            <SelectTrigger className="h-8 bg-white">
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
                    <div className="flex items-start space-x-3 p-3 rounded-lg bg-white/60">
                      <Checkbox
                        id="li"
                        checked={selectedLinkedIn}
                        onCheckedChange={(checked) =>
                          setSelectedLinkedIn(checked === true)
                        }
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
                        <p className="text-xs text-muted-foreground">
                          Texto, imagen y video
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              {/* Texto + AI Caption */}
              {!(selectedInstagram && instagramMediaType === "STORIES") && (
                <div className="flex justify-between gap-2 bg-white/60 rounded">
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
                      className="resize-none flex-1 bg-white"
                      disabled={publishing || uploadingMedia}
                    />
                  </div>
                </div>
              )}

              {selectedInstagram && instagramMediaType === "STORIES" && (
                <p className="text-sm text-muted-foreground bg-white/60 p-3 rounded">
                  Las Historias de Instagram no permiten texto a través de la
                  API.
                </p>
              )}

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
                  <span>Media (imagen o video)</span>

                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
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
                      disabled={publishing || uploadingMedia}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={publishing || uploadingMedia || !!videoUrl}
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Imagen
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={publishing || uploadingMedia || !!imageUrl}
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
                    )}
                  </div>

                  {uploadingMedia && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subiendo archivo...
                    </p>
                  )}
                </div>
              </div>
              {videoUrl && (
                <p className="text-sm text-muted-foreground bg-white/60 p-3 rounded">
                  LinkedIn video: MP4 recomendado, máx. ~200 MB, hasta ~10 min.
                </p>
              )}
              {/* Enlace */}
              <div className="space-y-2">
                <Label>Enlace (solo Facebook)</Label>
                <Input
                  placeholder="https://ejemplo.com"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  disabled={publishing || uploadingMedia}
                  className="bg-white"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <div>
            <PostPreview
              platform="linkedin"
              message={message}
              imageUrl={imageUrl}
              videoUrl={videoUrl}
            />
          </div>
          <Button
            className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white shadow-lg shadow-orange-500/25 transition-all"
            size="lg"
            onClick={handlePublish}
            disabled={
              !canEdit ||
              !companyId ||
              publishing ||
              uploadingMedia ||
              selectedCount === 0 ||
              (selectedInstagram && !imageUrl && !videoUrl) ||
              (!imageUrl && !videoUrl && !message.trim() && !selectedInstagram)
            }
          >
            {uploadingMedia ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo archivo...
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
    </div>
  );
}
