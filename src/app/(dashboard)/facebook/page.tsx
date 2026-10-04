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
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CredentialsForm } from "@/components/social/CredentialsForm";
import { FacebookComposer } from "@/components/social/FacebookComposer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function FacebookPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [checking, setChecking] = useState(true);

  const loadData = async () => {
    try {
      const credentialsSnap = await getDoc(
        doc(db, "platformCredentials", "facebook"),
      );
      setHasCredentials(credentialsSnap.exists());

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

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      setStatus({
        type: "success",
        text: "Cuenta de Facebook conectada correctamente",
      });
      loadData();
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

  const handlePublish = async (data: {
    message: string;
    link?: string;
    imageUrl?: string;
    videoUrl?: string;
  }) => {
    if (!account) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/publish/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: account.pageId,
          accessToken: account.accessToken,
          message: data.message,
          link: data.link,
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
        text: "Publicado correctamente en Facebook",
      });
    } catch (err: any) {
      setStatus({ type: "error", text: err.message });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectAccount = async () => {
    if (!account) return;
    if (!confirm("¿Seguro que quieres desconectar esta cuenta de Facebook?"))
      return;

    try {
      await deleteDoc(doc(db, "socialAccounts", account.id));
      setAccount(null);
      setStatus({ type: "success", text: "Cuenta desconectada" });
    } catch (error) {
      setStatus({ type: "error", text: "Error al desconectar la cuenta" });
    }
  };

  const handleDeleteCredentials = async () => {
    if (
      !confirm(
        "¿Seguro que quieres eliminar las credenciales? También se desconectará la cuenta.",
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "platformCredentials", "facebook"));

      if (account) {
        await deleteDoc(doc(db, "socialAccounts", account.id));
      }

      setHasCredentials(false);
      setAccount(null);
      setStatus({ type: "success", text: "Credenciales eliminadas" });
    } catch (error) {
      setStatus({ type: "error", text: "Error al eliminar las credenciales" });
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  // ================== ESTADO 1: Sin credenciales ==================
  if (!hasCredentials) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold">Facebook</h2>
          <p className="text-muted-foreground mt-1">
            Configura las credenciales de tu aplicación para comenzar
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Instrucciones importantes</AlertTitle>
          <AlertDescription className="mt-2 space-y-2 text-sm">
            <p>Antes de conectar, asegúrate de tener esto en tu App de Meta:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                En <strong>Use cases</strong> agrega:{" "}
                <code>Manage everything on your Page</code>
              </li>
              <li>
                En <strong>Facebook Login for Business → Configurations</strong>{" "}
                crea una configuration con estos permisos:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>pages_show_list</li>
                  <li>pages_read_engagement</li>
                  <li>pages_manage_posts</li>
                </ul>
              </li>
              <li>
                En <strong>App settings → Basic</strong> agrega tu dominio de
                Vercel
              </li>
              <li>
                En <strong>Valid OAuth Redirect URIs</strong> agrega:
                <br />
                <code className="text-xs">
                  https://tu-dominio.vercel.app/api/auth/facebook/callback
                </code>
              </li>
            </ol>
          </AlertDescription>
        </Alert>

        <CredentialsForm
          platform="facebook"
          onSuccess={() => setHasCredentials(true)}
        />
      </div>
    );
  }

  // ================== ESTADO 2: Credenciales pero sin cuenta ==================
  if (!account) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Facebook</h2>
            <p className="text-muted-foreground mt-1">
              Conecta tu página de Facebook para poder publicar
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDeleteCredentials}>
            Eliminar credenciales
          </Button>
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

  // ================== ESTADO 3: Todo listo (Composer) ==================
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
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Conectado</Badge>
          <Button variant="outline" size="sm" onClick={handleDisconnectAccount}>
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

      <FacebookComposer
        pageName={account.name}
        loading={loading}
        onPublish={handlePublish}
      />

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteCredentials}
          className="text-muted-foreground"
        >
          Eliminar credenciales
        </Button>
      </div>
    </div>
  );
}
