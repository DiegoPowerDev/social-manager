"use client";

import { useEffect, useState } from "react";
import { getTokenStatus, tokenStatusLabel } from "@/lib/tokenStatus";
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
import { LinkedInConnectFlow } from "@/components/social/LinkedInConnectFlow";
import { PostHistory } from "@/components/social/PostHistory";
import { PostPreview } from "@/components/social/PostPreview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LucideLoaderCircle } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

export default function LinkedInPage() {
  const [activeTab, setActiveTab] = useState("create");
  const searchParams = useSearchParams();
  const router = useRouter();

  const companyId = useAuthStore((s) => s.companyId);
  const memberRole = useAuthStore((s) => s.memberRole);
  const canEdit = memberRole === "admin" || memberRole === "editor";
  const canConnect = memberRole === "admin";

  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const loadAccount = async () => {
    try {
      if (!companyId) return;

      const q = query(
        collection(db, "socialAccounts"),
        where("companyId", "==", companyId),
        where("platform", "==", "linkedin"),
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setAccount({
          id: snapshot.docs[0].id,
          ...data,
          expiresAt: data.expiresAt?.toDate?.()
            ? data.expiresAt.toDate()
            : data.expiresAt
              ? new Date(data.expiresAt)
              : null,
        });
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
    if (companyId) loadAccount();
    else setChecking(false);
  }, [companyId]);

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
    if (!account || !companyId || !canEdit) return;
    if (!text.trim() && !imageUrl && !videoUrl) return;

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
          companyId,
          text,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
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
      setVideoUrl(null);
    } catch (err: any) {
      const msg = err.message || "Error al publicar";
      if (
        msg === "TOKEN_EXPIRED" ||
        msg.toLowerCase().includes("token") ||
        msg.includes("401")
      ) {
        setStatus({
          type: "error",
          text: "El token expiró o es inválido. Reconecta la cuenta.",
        });
      } else {
        setStatus({ type: "error", text: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!account || !canConnect) return;
    if (!confirm("¿Desconectar esta cuenta de LinkedIn?")) return;
    await deleteDoc(doc(db, "socialAccounts", account.id));
    setAccount(null);
  };

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LucideLoaderCircle className="animate-spin h-16 w-16 text-yellow-200" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="p-6 text-muted-foreground">
        No hay empresa asociada a tu cuenta.
      </div>
    );
  }

  if (!account) {
    return (
      <LinkedInConnectFlow
        companyId={companyId}
        canConnect={canConnect}
        status={status}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-6 bg-yellow-500/20">
        <div>
          <h2 className="text-2xl font-bold">LinkedIn</h2>
          <p className="text-muted-foreground mt-1">
            Publicando como{" "}
            <span className="font-medium text-foreground">{account.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const s = getTokenStatus(account.expiresAt);
            if (s === "expired")
              return <Badge variant="destructive">Token expirado</Badge>;
            if (s === "expiring_soon")
              return (
                <Badge className="bg-amber-500 hover:bg-amber-500">
                  Por vencer
                </Badge>
              );
            return <Badge variant="secondary">Conectado</Badge>;
          })()}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={!canConnect}
          >
            Desconectar
          </Button>
        </div>
      </div>

      {(() => {
        const tokenStatus = getTokenStatus(account.expiresAt);
        if (tokenStatus === "ok") return null;

        return (
          <div
            className={`mx-6 mb-2 p-3 rounded-md text-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
              tokenStatus === "expired"
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-amber-50 text-amber-900 border-amber-200"
            }`}
          >
            <div>
              <p className="font-medium">{tokenStatusLabel(tokenStatus)}</p>
              {account.expiresAt && (
                <p className="text-xs mt-0.5 opacity-80">
                  Expira: {account.expiresAt.toLocaleString()}
                </p>
              )}
            </div>
            {canConnect && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.location.href = `/api/auth/linkedin?companyId=${companyId}`;
                }}
              >
                Reconectar LinkedIn
              </Button>
            )}
          </div>
        );
      })()}

      <div className="w-full h-full p-6">
        {status && (
          <div
            className={`p-3 rounded-md text-sm mb-4 ${
              status.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {status.text}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-yellow-500/60 font-bold backdrop-blur-xs">
            <TabsTrigger value="create">Crear contenido</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className={cn(activeTab === "create" ? "mt-6 block" : "hidden")}>
          {!canEdit ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-md">
              Tu rol es solo lectura. No puedes publicar ni desconectar.
            </p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <LinkedInComposer
                  accountName={account.name}
                  loading={loading}
                  text={text}
                  onTextChange={setText}
                  imageUrl={imageUrl}
                  onImageChange={setImageUrl}
                  videoUrl={videoUrl}
                  onVideoChange={setVideoUrl}
                  onPublish={handlePublish}
                />
              </div>
              <div>
                <PostPreview
                  platform="linkedin"
                  accountName={account.name}
                  message={text}
                  imageUrl={imageUrl}
                  videoUrl={videoUrl}
                />
              </div>
            </div>
          )}
        </div>

        <div className={activeTab === "history" ? "mt-6 block" : "hidden"}>
          <PostHistory
            pageId={account.personId}
            platform="linkedin"
            key={status?.type === "success" ? Date.now() : "history"}
          />
        </div>
      </div>
    </div>
  );
}
