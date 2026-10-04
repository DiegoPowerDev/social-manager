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
  const [loading, setLoading] = useState(true);
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
      console.error(error);
    } finally {
      setLoading(false);
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
  }, [searchParams]);

  if (loading) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  // No hay cuenta conectada
  if (!account) {
    return (
      <div className="space-y-6 max-w-md">
        <div>
          <h2 className="text-2xl font-bold">Instagram</h2>
          <p className="text-muted-foreground mt-1">
            Conecta tu cuenta de Instagram Business
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
              Necesitas una cuenta de Instagram Business o Creator vinculada a
              una Página de Facebook.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => (window.location.href = "/api/auth/instagram")}
            >
              Conectar Instagram
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cuenta conectada
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Instagram</h2>
          <p className="text-muted-foreground mt-1">
            Conectado como{" "}
            <span className="font-medium">@{account.username}</span>
          </p>
        </div>
        <Badge variant="secondary">Conectado</Badge>
      </div>

      {status && (
        <div className="p-3 rounded-md text-sm bg-green-50 text-green-700 border border-green-200">
          {status.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cuenta conectada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            <strong>Nombre:</strong> {account.name}
          </p>
          <p className="text-sm mt-1">
            <strong>Usuario:</strong> @{account.username}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
