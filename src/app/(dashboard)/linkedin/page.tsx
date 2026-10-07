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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function LinkedInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [account, setAccount] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadAccount = async () => {
    try {
      const q = query(
        collection(db, "socialAccounts"),
        where("platform", "==", "linkedin"),
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
      setStatus({ type: "success", text: "Cuenta de LinkedIn conectada" });
      loadAccount();
      router.replace("/linkedin");
    }

    if (error) {
      setStatus({ type: "error", text: `Error al conectar: ${error}` });
      router.replace("/linkedin");
    }
  }, [searchParams]);

  const handleDisconnect = async () => {
    if (!account || !confirm("¿Desconectar esta cuenta de LinkedIn?")) return;
    await deleteDoc(doc(db, "socialAccounts", account.id));
    setAccount(null);
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="max-w-md space-y-6">
        <div>
          <h2 className="text-2xl font-bold">LinkedIn</h2>
          <p className="text-muted-foreground mt-1">
            Conecta tu perfil personal de LinkedIn
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
            <CardTitle>Conectar LinkedIn</CardTitle>
            <CardDescription>
              Se publicará desde tu perfil personal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => (window.location.href = "/api/auth/linkedin")}
            >
              Conectar LinkedIn
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">LinkedIn</h2>
          <p className="text-muted-foreground mt-1">
            Conectado como{" "}
            <span className="font-medium text-foreground">{account.name}</span>
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

      <Card>
        <CardHeader>
          <CardTitle>Listo para publicar</CardTitle>
          <CardDescription>
            En el siguiente paso agregamos el compositor de posts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cuenta conectada correctamente. ¿Seguimos con la publicación de
            texto e imagen?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
