"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { saveMediaToLibrary } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ImagePlus,
  Trash2,
  Video,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  fileName: string;
  size: number;
  mimeType: string;
  createdAt?: Date;
}

type TypeFilter = "all" | "image" | "video";

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibraryPage() {
  const { companyId, user, memberRole } = useAuthStore();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canEdit = memberRole === "admin" || memberRole === "editor";

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "media"),
        where("companyId", "==", companyId),
        orderBy("createdAt", "desc"),
        limit(60),
      );
      const snap = await getDocs(q);
      const data: MediaItem[] = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          url: x.url,
          type: x.type === "video" ? "video" : "image",
          fileName: x.fileName || "archivo",
          size: x.size || 0,
          mimeType: x.mimeType || "",
          createdAt: x.createdAt?.toDate?.() || undefined,
        };
      });
      setItems(data);
    } catch (e: any) {
      console.error(e);
      setError(
        e.message?.includes("index")
          ? "Falta un índice en Firestore (companyId + createdAt). Créalo desde el link del error en consola."
          : e.message || "Error al cargar la biblioteca",
      );
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!q) return true;
      return item.fileName.toLowerCase().includes(q);
    });
  }, [items, search, typeFilter]);

  const previewItem =
    previewIndex !== null ? (filtered[previewIndex] ?? null) : null;

  const openPreview = (id: string) => {
    const idx = filtered.findIndex((i) => i.id === id);
    if (idx >= 0) setPreviewIndex(idx);
  };

  const goPrev = useCallback(() => {
    setPreviewIndex((i) => {
      if (i === null || filtered.length === 0) return i;
      return (i - 1 + filtered.length) % filtered.length;
    });
  }, [filtered.length]);

  const goNext = useCallback(() => {
    setPreviewIndex((i) => {
      if (i === null || filtered.length === 0) return i;
      return (i + 1) % filtered.length;
    });
  }, [filtered.length]);

  // Si el filtro cambia y el índice queda fuera de rango
  useEffect(() => {
    if (previewIndex === null) return;
    if (filtered.length === 0) {
      setPreviewIndex(null);
      return;
    }
    if (previewIndex >= filtered.length) {
      setPreviewIndex(filtered.length - 1);
    }
  }, [filtered, previewIndex]);

  const uploadFile = async (file: File) => {
    if (!companyId || !user) {
      setError("No hay empresa o sesión");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          platform: "library",
          contentType: file.type || "application/octet-stream",
          fileName: file.name,
        }),
      });

      let publicUrl: string;
      let key: string | undefined;

      if (signRes.ok) {
        const signed = await signRes.json();
        const putRes = await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!putRes.ok) throw new Error("Error al subir a almacenamiento");
        publicUrl = signed.publicUrl;
        key = signed.key;
      } else {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("platform", "library");
        formData.append("companyId", companyId);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al subir");
        publicUrl = data.publicUrl;
      }

      await saveMediaToLibrary({
        companyId,
        uid: user.uid,
        url: publicUrl,
        key: key,
        fileName: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        source: "upload",
      });

      await load();
    } catch (e: any) {
      setError(e.message || "Error al subir");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
  };

  const handleDelete = async (id: string) => {
    if (!canEdit || !companyId || !user) return;
    if (
      !confirm("¿Eliminar este archivo de la biblioteca y del almacenamiento?")
    ) {
      return;
    }
    try {
      const res = await fetch("/api/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: id,
          companyId,
          uid: user.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar");

      setItems((prev) => prev.filter((i) => i.id !== id));
      setPreviewIndex((idx) => {
        if (idx === null) return null;
        const still = filtered.filter((i) => i.id !== id);
        if (still.length === 0) return null;
        return Math.min(idx, still.length - 1);
      });
    } catch (e: any) {
      setError(e.message || "No se pudo eliminar");
    }
  };

  const downloadFile = async (item: MediaItem) => {
    if (!companyId || !user) return;
    try {
      setDownloadingId(item.id);
      const qs = new URLSearchParams({
        mediaId: item.id,
        companyId,
        uid: user.uid,
      });
      const res = await fetch(`/api/media/download?${qs}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo descargar");
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download =
        item.fileName || (item.type === "video" ? "video.mp4" : "imagen.jpg");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      setError(e.message || "No se pudo descargar");
    } finally {
      setDownloadingId(null);
    }
  };

  if (!companyId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No hay empresa asociada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between bg-zinc-950/50 backdrop-blur">
        <div className="p-6 text-white">
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-sm">
            Archivos de tu empresa para reutilizar en publicaciones
          </p>
        </div>
        {canEdit && (
          <div className="px-6">
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={onFileChange}
            />
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="bg-yellow-500 text-black hover:bg-yellow-400"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo…
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Subir archivo
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="mx-6 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg p-3">
          {error}
        </p>
      )}

      <div className="flex-1 flex justify-center p-6 pt-0">
        <Card className="bg-zinc-950/60 w-full flex-1">
          <CardHeader className="pb-3 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-white">Archivos</CardTitle>
                <CardDescription className="text-white/70">
                  {filtered.length} de {items.length} elemento
                  {items.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8 bg-white"
                    placeholder="Buscar por nombre…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v as TypeFilter)}
                >
                  <SelectTrigger className="bg-white w-full sm:w-36">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="image">Imágenes</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex-1 w-full flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-16 text-sm">
                {items.length === 0
                  ? "Aún no hay archivos. Sube una imagen o video para empezar."
                  : "No hay resultados con ese filtro o búsqueda."}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded bg-white overflow-hidden"
                  >
                    <div
                      className="aspect-square bg-muted flex items-center justify-center cursor-pointer"
                      onClick={() => openPreview(item.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          openPreview(item.id);
                        }
                      }}
                    >
                      {item.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={item.fileName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="relative h-full w-full bg-black">
                          <video
                            src={`${item.url}#t=0.1`}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover pointer-events-none"
                          />
                          <div className="absolute bottom-1 left-1 rounded bg-black/60 p-1">
                            <Video className="h-3.5 w-3.5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2 flex flex-col items-center justify-between gap-1">
                      <p
                        className="text-xs truncate w-full text-center"
                        title={item.fileName}
                      >
                        {item.fileName}
                      </p>
                      <div className="flex shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => downloadFile(item)}
                          disabled={downloadingId === item.id}
                          title="Descargar"
                        >
                          {downloadingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500"
                            onClick={() => handleDelete(item.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog
        open={previewIndex !== null && !!previewItem}
        onOpenChange={(open) => {
          if (!open) setPreviewIndex(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl w-[95vw] p-0 gap-0 overflow-hidden bg-zinc-950 border-white/10 text-white">
          {previewItem && (
            <>
              <DialogHeader className="px-4 py-3 border-b border-white/10 flex flex-row items-center justify-between space-y-0 shrink-0">
                <div className="min-w-0 pr-8">
                  <DialogTitle className="text-base truncate">
                    {previewItem.fileName}
                  </DialogTitle>
                  <p className="text-xs text-white/50 mt-0.5">
                    {previewItem.type === "video" ? "Video" : "Imagen"}
                    {" · "}
                    {formatSize(previewItem.size)}
                    {filtered.length > 1 && (
                      <>
                        {" · "}
                        {(previewIndex ?? 0) + 1} / {filtered.length}
                      </>
                    )}
                  </p>
                </div>
              </DialogHeader>

              {/* Marco fijo: mismo tamaño siempre */}
              <div className="relative w-full aspect-video bg-black">
                {filtered.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full opacity-90"
                      onClick={goPrev}
                      title="Anterior (←)"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full opacity-90"
                      onClick={goNext}
                      title="Siguiente (→)"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}

                {previewItem.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewItem.url}
                    alt={previewItem.fileName}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : (
                  <video
                    key={previewItem.id}
                    src={previewItem.url}
                    controls
                    autoPlay
                    playsInline
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-white/10 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={downloadingId === previewItem.id}
                  onClick={() => downloadFile(previewItem)}
                >
                  {downloadingId === previewItem.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Descargar
                </Button>
                {canEdit && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(previewItem.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
