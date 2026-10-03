"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CredentialsForm } from "@/components/social/CredentialsForm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function FacebookPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [checking, setChecking] = useState(true);

  // 1. Verificar credenciales + cuenta conectada
  const loadData = async () => {
    try {
      // Credenciales
      const credentialsSnap = await getDoc(
        doc(db, "platformCredentials", "facebook"),
      );
      setHasCredentials(credentialsSnap.exists());

      // Cuenta conectada
      const q = query(
        collection(db, "socialAccounts"),
        where("platform", "==", "facebook"),
      );
      const accountsSnap = await getDocs(q);

      if (!accountsSnap.empty) {
        const data = accountsSnap.docs[0].data();
        setAccount({ id: accountsSnap.docs[0].id, ...data });
      } else {
        setAccount(null);
      }
    } catch (error) {
      console.error("Error cargando datos de Facebook:", error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. Manejar mensajes de la URL (?success=true o ?error=...)
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      setStatus({
        type: "success",
        text: "Cuenta de Facebook conectada correctamente",
      });
      loadData(); // Recargamos para mostrar la cuenta
      // Limpiamos la URL
      router.replace("/facebook");
    }

    if (error) {
      const messages: Record<string, string> = {
        no_code: "No se recibió el código de autorización",
        no_credentials: "No hay credenciales configuradas",
        token_error: "Error al obtener el token de acceso",
        no_pages: "No se encontraron páginas de Facebook",
        connection_failed: "Error al conectar la cuenta",
      };

      setStatus({
        type: "error",
        text: messages[error] || "Ocurrió un error al conectar",
      });

      router.replace("/facebook");
    }
  }, [searchParams, router]);

  // 3. Publicar post de texto
  const handlePublish = async () => {
    if (!message.trim() || !account) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/publish/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: account.pageId,
          accessToken: account.accessToken,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al publicar");
      }

      setStatus({
        type: "success",
        text: "Publicado correctamente en Facebook",
      });
      setMessage("");
    } catch (err: any) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ================== ESTADOS DE LA PÁGINA ==================

  if (checking) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  // Estado 1: No hay credenciales
  if (!hasCredentials) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Facebook</h2>
          <p className="text-muted-foreground mt-1">
            Configura las credenciales de tu aplicación para comenzar
          </p>
        </div>

        <CredentialsForm
          platform="facebook"
          onSuccess={() => setHasCredentials(true)}
        />
      </div>
    );
  }

  // Estado 2: Hay credenciales pero no hay cuenta conectada
  if (!account) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Facebook</h2>
          <p className="text-muted-foreground mt-1">
            Conecta tu página de Facebook para poder publicar
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

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Conectar página</CardTitle>
            <CardDescription>
              Se te redirigirá a Facebook para autorizar el acceso a tu página.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                window.location.href = "/api/auth/facebook";
              }}
            >
              Conectar Facebook
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado 3: Todo listo → Composer
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Facebook</h2>
          <p className="text-muted-foreground mt-1">
            Publicando como{" "}
            <span className="font-medium text-foreground">{account.name}</span>
          </p>
        </div>
        <Badge variant="secondary">Conectado</Badge>
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
          <CardTitle>Nueva publicación</CardTitle>
          <CardDescription>Solo texto por ahora</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="¿Qué quieres publicar en Facebook?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
          />

          <div className="flex justify-end">
            <Button
              onClick={handlePublish}
              disabled={loading || !message.trim()}
            >
              {loading ? "Publicando..." : "Publicar ahora"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
