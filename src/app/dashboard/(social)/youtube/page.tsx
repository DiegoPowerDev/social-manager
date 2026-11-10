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
import { auth, db } from "@/lib/firebase";
import { YouTubeConnectFlow } from "@/components/social/YouTubeConnectFlow";
import { YouTubeComposer } from "@/components/social/YouTubeComposer";
import { PostHistory } from "@/components/social/PostHistory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LucideLoaderCircle } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";

export default function YouTubePage() {
  const [activeTab, setActiveTab] = useState("create");
  const [historyKey, setHistoryKey] = useState(0);
  const searchParams = useSearchParams();
  const router = useRouter();

  const companyId = useAuthStore((s) => s.companyId);
  const memberRole = useAuthStore((s) => s.memberRole);
  const canEdit = memberRole === "admin" || memberRole === "editor";
  const canConnect = memberRole === "admin";

  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

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
      toast.error("Error al cargar el canal de YouTube");
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
      toast.success("Canal de YouTube conectado");
      loadAccount();
      router.replace("/dashboard/youtube");
    }
    if (error) {
      toast.error(`Error al conectar: ${error}`);
      router.replace("/dashboard/youtube");
    }
  }, [searchParams]);

  const handlePublish = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("Sesión expirada. Vuelve a iniciar sesión.");
      return;
    }
    const idToken = await user.getIdToken();
    if (!account || !companyId || !canEdit) return;
    if (!videoUrl) {
      toast.error("Sube un video");
      return;
    }
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    setLoading(true);
    const tid = toast.loading("Publicando en YouTube…");
    try {
      const res = await fetch("/api/publish/youtube", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
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

      toast.success("Video publicado en YouTube", { id: tid });
      setTitle("");
      setDescription("");
      setVideoUrl(null);
      setHistoryKey((k) => k + 1);
    } catch (err: any) {
      const msg = err.message || "Error al publicar";
      if (msg === "TOKEN_EXPIRED" || msg.toLowerCase().includes("token")) {
        toast.error("Sesión de YouTube inválida. Reconecta el canal.", {
          id: tid,
        });
      } else {
        toast.error(msg, { id: tid });
      }
    } finally {
      setLoading(false);
    }
  };

  const performDisconnect = async () => {
    if (!account || !canConnect) return;
    setDisconnecting(true);
    const tid = toast.loading("Desconectando…");
    try {
      await deleteDoc(doc(db, "socialAccounts", account.id));
      setAccount(null);
      setDisconnectOpen(false);
      toast.success("Canal desconectado", { id: tid });
    } catch (e: any) {
      toast.error(e.message || "No se pudo desconectar", { id: tid });
    } finally {
      setDisconnecting(false);
    }
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
        status={null}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between bg-zinc-950/50">
        <div className="p-6 text-white">
          <h1 className="text-2xl font-bold">YouTube</h1>
          <p className="text-sm">
            Canal:{" "}
            <span className="font-bold text-white">
              {account.channelTitle || account.name}
            </span>
          </p>
        </div>
        <div className="flex p-6 items-center gap-2">
          <Badge variant="secondary">Conectado</Badge>
          {canConnect && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = `/api/auth/youtube?companyId=${companyId}`;
                }}
              >
                Reconectar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDisconnectOpen(true)}
              >
                Desconectar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList variant="line" className="grid w-full max-w-md grid-cols-2">
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
            key={historyKey}
          />
        </div>
      </div>

      <ConfirmDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title="¿Desconectar YouTube?"
        description="Dejarás de poder subir videos hasta volver a conectar el canal."
        confirmLabel="Desconectar"
        destructive
        loading={disconnecting}
        onConfirm={performDisconnect}
      />
    </div>
  );
}
