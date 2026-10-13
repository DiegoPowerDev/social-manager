"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Loader2, Video, X, FolderOpen } from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  fileName: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** image | video | all */
  accept?: "image" | "video" | "all";
  onSelect: (item: { url: string; type: "image" | "video" }) => void;
}

export function MediaLibraryPicker({
  open,
  onClose,
  accept = "all",
  onSelect,
}: Props) {
  const companyId = useAuthStore((s) => s.companyId);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "media"),
        where("companyId", "==", companyId),
        orderBy("createdAt", "desc"),
        limit(60),
      );
      const snap = await getDocs(q);
      let data: MediaItem[] = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          url: x.url,
          type: x.type === "video" ? "video" : "image",
          fileName: x.fileName || "archivo",
        };
      });
      if (accept === "image") data = data.filter((i) => i.type === "image");
      if (accept === "video") data = data.filter((i) => i.type === "video");
      setItems(data);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, accept]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            <h3 className="font-semibold">Biblioteca de medios</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-16">
              No hay archivos
              {accept === "image"
                ? " de imagen"
                : accept === "video"
                  ? " de video"
                  : ""}{" "}
              en la biblioteca. Sube alguno en Media Library.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="rounded-lg border overflow-hidden hover:ring-2 hover:ring-yellow-500 transition text-left"
                  onClick={() => {
                    onSelect({ url: item.url, type: item.type });
                    onClose();
                  }}
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
                      <Video className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-[10px] truncate px-1.5 py-1">
                    {item.fileName}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
