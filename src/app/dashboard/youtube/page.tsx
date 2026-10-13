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
import { YouTubeConnectFlow } from "@/components/social/YouTubeConnectFlow";
import { YouTubeComposer } from "@/components/social/YouTubeComposer";
import { PostHistory } from "@/components/social/PostHistory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LucideLoaderCircle } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

export default function YouTubePage() {
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [privacyStatus, setPrivacyStatus] = useState<
    "public" | "unlisted" | "private"
  >("public");

  const loadAccount = async () => {
    try {
      if (!companyId) return;
      const q = query(
        collection(db, "socialAccounts"),
        where("companyId", "==", companyId),
        where("platform", "==", "youtube"),
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
    } catch (e) {
      console.error(e);
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
      setStatus({ type: "success", text: "Canal de YouTube conectado" });
      loadAccount();
      router.replace("/dashboard/youtube");
    }
    if (error) {
      setStatus({ type: "error", text: `Error al conectar: ${error}` });
      router.replace("/dashboard/youtube");
    }
  }, [searchParams]);

  const handlePublish = async () => {
    if (!account || !companyId || !canEdit) return;
    if (!videoUrl) {
      setStatus({ type: "error", text: "Sube un video" });
      return;
    }
    if (!title.trim()) {
      setStatus({ type: "error", text: "El título es obligatorio" });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/publish/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          channelId: account.channelId,
          accessToken: account.accessToken,
          refreshToken: account.refreshToken,
          accountDocId: account.id,
          title: title.trim(),
          description: description.trim(),
          videoUrl,
          privacyStatus,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al publicar");

      setStatus({ type: "success", text: "Video publicado en YouTube" });
      setTitle("");
      setDescription("");
      setVideoUrl(null);
    } catch (err: any) {
      setStatus({ type: "error", text: err.message || "Error al publicar" });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!account || !canConnect) return;
    if (!confirm("¿Desconectar este canal de YouTube?")) return;
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
      <YouTubeConnectFlow
        companyId={companyId}
        canConnect={canConnect}
        status={status}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-zinc-950/50 backdrop-blur">
        <div className="p-6  text-white">
          <h1 className="text-2xl font-bold">YouTube</h1>
          <p className="text-sm">
            Canal:{" "}
            <span className="font-bold text-white">
              {account.channelTitle || account.name}
            </span>
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
            className={`mx-6 p-3 rounded-md text-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
              tokenStatus === "expired"
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-amber-50 text-amber-900 border-amber-200"
            }`}
          >
            <p className="font-medium">{tokenStatusLabel(tokenStatus)}</p>
            {canConnect && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.location.href = `/api/auth/youtube?companyId=${companyId}`;
                }}
              >
                Reconectar YouTube
              </Button>
            )}
          </div>
        );
      })()}

      <div className="p-6">
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="create">Subir video</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className={cn(activeTab === "create" ? "mt-6 block" : "hidden")}>
          {!canEdit ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-md">
              Tu rol es solo lectura.
            </p>
          ) : (
            <YouTubeComposer
              channelName={account.channelTitle || account.name}
              loading={loading}
              title={title}
              onTitleChange={setTitle}
              description={description}
              onDescriptionChange={setDescription}
              videoUrl={videoUrl}
              onVideoChange={setVideoUrl}
              privacyStatus={privacyStatus}
              onPrivacyChange={setPrivacyStatus}
              onPublish={handlePublish}
            />
          )}
        </div>

        <div className={activeTab === "history" ? "mt-6 block" : "hidden"}>
          <PostHistory
            pageId={account.channelId}
            platform="youtube"
            key={status?.type === "success" ? Date.now() : "history"}
          />
        </div>
      </div>
    </div>
  );
}
