"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
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
} from "lucide-react";
import { AICaptionGenerator } from "@/components/social/AICaptionGenerator";
import { AIImageGenerator } from "@/components/social/AIImageGenerator";

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
    const loadAccounts = async () => {
      try {
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
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadAccounts();
  }, []);

  const facebookAccount = accounts.find((a) => a.platform === "facebook");
  const instagramAccount = accounts.find((a) => a.platform === "instagram");
  const linkedinAccount = accounts.find((a) => a.platform === "linkedin");

  const uploadToR2 = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "bulk");

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
        // LinkedIn no soporta video en este flujo simple (solo texto + imagen)
        if (videoUrl && !imageUrl) {
          publishResults.push({
            platform: "LinkedIn",
            success: false,
            message:
              "Por ahora LinkedIn solo soporta texto e imagen (no video)",
          });
        } else {
          const res = await fetch("/api/publish/linkedin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              personId: linkedinAccount.personId,
              accessToken: linkedinAccount.accessToken,
              name: linkedinAccount.name,
              text: message,
              imageUrl: imageUrl || undefined,
            }),
          });

          const data = await res.json();
          publishResults.push({
            platform: "LinkedIn",
            success: res.ok,
            message: res.ok ? "Publicado correctamente" : data.error || "Error",
          });
        }
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
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando cuentas...</p>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-bold">Publicar en varias redes</h2>
        <p className="text-muted-foreground">
          No tienes ninguna red conectada. Conecta Facebook, Instagram o
          LinkedIn primero.
        </p>
      </div>
    );
  }

  const selectedCount = [
    selectedFacebook,
    selectedInstagram,
    selectedLinkedIn,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold">Publicar en varias redes</h2>
        <p className="text-muted-foreground mt-1">
          Crea el contenido una vez y publícalo en todas las redes seleccionadas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenido */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Contenido</CardTitle>
              <CardDescription>
                Este contenido se adaptará a cada red
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {instagramMediaType !== "STORIES" && (
                <AICaptionGenerator
                  platform="general"
                  onGenerate={(caption) => setMessage(caption)}
                />
              )}

              <AIImageGenerator
                onGenerate={(url) => {
                  setImageUrl(url);
                  setVideoUrl(null);
                }}
              />

              {instagramMediaType !== "STORIES" && (
                <div className="space-y-2">
                  <Label>Texto / Caption</Label>
                  <Textarea
                    placeholder="Escribe tu publicación..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    disabled={publishing || uploadingMedia}
                  />
                </div>
              )}

              {instagramMediaType === "STORIES" && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  Las Historias de Instagram no permiten texto a través de la
                  API.
                </p>
              )}

              {/* Media */}
              <div className="space-y-3">
                <Label>Media (imagen o video)</Label>

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

                {!imageUrl && !videoUrl && (
                  <div className="flex items-center gap-2">
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
                      disabled={publishing || uploadingMedia}
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Subir imagen
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={publishing || uploadingMedia}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Subir video
                    </Button>
                  </div>
                )}

                {uploadingMedia && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subiendo archivo...
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Enlace (solo Facebook)</Label>
                <Input
                  placeholder="https://ejemplo.com"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  disabled={publishing || uploadingMedia}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Redes */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Redes</CardTitle>
              <CardDescription>Selecciona dónde publicar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {facebookAccount && (
                <div className="flex items-start space-x-3 p-3 rounded-lg border">
                  <Checkbox
                    id="fb"
                    checked={selectedFacebook}
                    onCheckedChange={(checked) =>
                      setSelectedFacebook(checked === true)
                    }
                    disabled={publishing}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="fb" className="font-medium cursor-pointer">
                      Facebook
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {facebookAccount.name}
                    </p>
                  </div>
                </div>
              )}

              {instagramAccount && (
                <div className="space-y-3 p-3 rounded-lg border">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="ig"
                      checked={selectedInstagram}
                      onCheckedChange={(checked) =>
                        setSelectedInstagram(checked === true)
                      }
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
                        onValueChange={(v) => setInstagramMediaType(v as any)}
                        disabled={publishing}
                      >
                        <SelectTrigger className="h-8">
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
                <div className="flex items-start space-x-3 p-3 rounded-lg border">
                  <Checkbox
                    id="li"
                    checked={selectedLinkedIn}
                    onCheckedChange={(checked) =>
                      setSelectedLinkedIn(checked === true)
                    }
                    disabled={publishing}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="li" className="font-medium cursor-pointer">
                      LinkedIn
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {linkedinAccount.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Solo texto e imagen
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            onClick={handlePublish}
            disabled={
              publishing ||
              uploadingMedia ||
              selectedCount === 0 ||
              (selectedInstagram && !imageUrl && !videoUrl)
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
            <Card>
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
