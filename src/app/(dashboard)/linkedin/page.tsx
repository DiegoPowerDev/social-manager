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
import { LinkedInComposer } from "@/components/social/LinkedInComposer";
import { PostHistory } from "@/components/social/PostHistory";
import { PostPreview } from "@/components/social/PostPreview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Estado controlado del post
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("create");

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

  const handlePublish = async () => {
    if (!account) return;
    if (!text.trim() && !imageUrl) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/publish/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: account.personId,
          accessToken: account.accessToken,
          name: account.name,
          text,
          imageUrl: imageUrl || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al publicar");

      setStatus({
        type: "success",
        text: "Publicado correctamente en LinkedIn",
      });
      setText("");
      setImageUrl(null);
    } catch (err: any) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

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
            Publicando como{" "}
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="create">Crear contenido</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Crear - siempre montado */}
      <div className={activeTab === "create" ? "mt-6 block" : "hidden"}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <LinkedInComposer
              accountName={account.name}
              loading={loading}
              text={text}
              onTextChange={setText}
              imageUrl={imageUrl}
              onImageChange={setImageUrl}
              onPublish={handlePublish}
            />
          </div>

          <div>
            <PostPreview
              platform="facebook"
              accountName={account.name}
              message={text}
              imageUrl={imageUrl}
              videoUrl={null}
            />
          </div>
        </div>
      </div>

      {/* Historial */}
      <div className={activeTab === "history" ? "mt-6 block" : "hidden"}>
        <PostHistory
          pageId={account.personId}
          platform="linkedin"
          key={status?.type === "success" ? Date.now() : "history"}
        />
      </div>
    </div>
  );
}
