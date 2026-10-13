"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, ImagePlus, Trash2, Video, Download } from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  fileName: string;
  size: number;
  mimeType: string;
  createdAt?: Date;
}

export default function MediaLibraryPage() {
  const { companyId, user, memberRole } = useAuthStore();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
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

  const uploadFile = async (file: File) => {
    if (!companyId || !user) {
      setError("No hay empresa o sesión");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      // Preferible: upload firmado (mismo que YouTube)
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
        // Fallback: /api/upload con FormData
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
        key,
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
    if (!canEdit) return;
    if (
      !confirm(
        "¿Eliminar de la biblioteca? (no borra el archivo de R2 en esta versión)",
      )
    ) {
      return;
    }
    try {
      await deleteDoc(doc(db, "media", id));
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      setError(e.message || "No se pudo eliminar");
    }
  };

  const downloadFile = async (item: MediaItem) => {
    try {
      setDownloadingId(item.id);
      const res = await fetch(item.url);
      if (!res.ok) throw new Error("No se pudo descargar el archivo");

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
      // Fallback: abrir en nueva pestaña si CORS bloquea el fetch
      window.open(item.url, "_blank", "noopener,noreferrer");
      setError(
        e.message || "No se pudo forzar la descarga; se abrió el archivo",
      );
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-zinc-950/50 backdrop-blur">
        <div className="p-6  text-white">
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-sm">
            Archivos de tu empresa para reutilizar en publicaciones
          </p>
        </div>
        {canEdit && (
          <div>
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
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg p-3">
          {error}
        </p>
      )}
      <div className="flex justify-center p-6">
        <Card className="bg-white/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Archivos</CardTitle>
            <CardDescription>
              {items.length} elemento{items.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-center text-muted-foreground py-16 text-sm">
                Aún no hay archivos. Sube una imagen o video para empezar.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded-xl border bg-white overflow-hidden"
                  >
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      {item.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={item.fileName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Video className="h-8 w-8" />
                          <span className="text-xs px-2 truncate max-w-full">
                            {item.fileName}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-2 flex flex-col items-center justify-between gap-1">
                      <p
                        className="text-xs truncate flex-1"
                        title={item.fileName}
                      >
                        {item.fileName}
                      </p>
                      <div className="flex shrink-0">
                        {/* solo funciona en producción */}
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
    </div>
  );
}
