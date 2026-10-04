"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { InstagramComposer } from "@/components/social/InstagramComposer";
import { PostHistory } from "@/components/social/PostHistory";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function InstagramPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadAccount = async () => {
    try {
      const q = query(
        collection(db, "socialAccounts"),
        where("platform", "==", "instagram"),
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setAccount({ id: snapshot.docs[0].id, ...data });
      } else {
        setAccount(null);
      }
    } catch (error) {
      console.error("Error cargando cuenta de Instagram:", error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    loadAccount();
  }, []);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      setStatus({
        type: "success",
        text: "Cuenta de Instagram conectada correctamente",
      });
      loadAccount();
      router.replace("/instagram");
    }

    if (error) {
      const messages: Record<string, string> = {
        no_code: "No se recibió el código de autorización",
        no_credentials: "No hay credenciales configuradas",
        token_error: "Error al obtener el token",
        no_pages: "No se encontraron páginas de Facebook",
        no_instagram:
          "No se encontró una cuenta de Instagram Business vinculada",
        connection_failed: "Error al conectar la cuenta",
      };

      setStatus({
        type: "error",
        text: messages[error] || "Ocurrió un error al conectar",
      });
      router.replace("/instagram");
    }
  }, [searchParams, router]);

  const handlePublish = async (data: {
    caption: string;
    imageUrl?: string;
    videoUrl?: string;
  }) => {
    if (!account) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/publish/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          igUserId: account.igUserId,
          accessToken: account.accessToken,
          username: account.username,
          caption: data.caption,
          imageUrl: data.imageUrl,
          videoUrl: data.videoUrl,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Error al publicar");
      }

      setStatus({
        type: "success",
        text: "Publicado correctamente en Instagram",
      });
    } catch (err: any) {
      setStatus({ type: "error", text: err.message });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!account) return;
    if (!confirm("¿Seguro que quieres desconectar esta cuenta de Instagram?"))
      return;

    try {
      await deleteDoc(doc(db, "socialAccounts", account.id));
      setAccount(null);
      setStatus({ type: "success", text: "Cuenta desconectada" });
    } catch (error) {
      setStatus({ type: "error", text: "Error al desconectar la cuenta" });
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  // ================== SIN CUENTA CONECTADA ==================
  if (!account) {
    return (
      <div className="space-y-6 max-w-md">
        <div>
          <h2 className="text-2xl font-bold">Instagram</h2>
          <p className="text-muted-foreground mt-1">
            Conecta tu cuenta de Instagram Business o Creator
          </p>
        </div>

        {status && (
          <div
            className={`p-3 rounded-md text-sm ${
              status.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {status.text}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Conectar Instagram</CardTitle>
            <CardDescription>
              Necesitas una cuenta Business o Creator vinculada a una Página de
              Facebook.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                window.location.href = "/api/auth/instagram";
              }}
            >
              Conectar Instagram
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ================== CUENTA CONECTADA ==================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Instagram</h2>
          <p className="text-muted-foreground mt-1">
            Publicando como{" "}
            <span className="font-medium text-foreground">
              @{account.username}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Conectado</Badge>
          <Button variant="outline" size="sm" onClick={handleDisconnect}>
            Desconectar
          </Button>
        </div>
      </div>

      {status && (
        <div
          className={`p-3 rounded-md text-sm ${
            status.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {status.text}
        </div>
      )}

      {/* Layout de dos columnas */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Composer */}
        <div className="xl:col-span-3">
          <InstagramComposer
            username={account.username}
            loading={loading}
            onPublish={handlePublish}
          />
        </div>

        {/* Historial */}
        <div className="xl:col-span-2">
          <PostHistory
            pageId={account.igUserId}
            platform="instagram"
            key={status?.type === "success" ? Date.now() : "history"}
          />
        </div>
      </div>
    </div>
  );
}
