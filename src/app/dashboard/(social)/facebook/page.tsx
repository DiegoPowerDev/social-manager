"use client";

import { getTokenStatus, tokenStatusLabel } from "@/lib/tokenStatus";
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
import { FacebookComposer } from "@/components/social/FacebookComposer";
import { PostHistory } from "@/components/social/PostHistory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LucideLoaderCircle } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { FacebookConnectFlow } from "@/components/social/FacebookConnectFlow";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";

export default function FacebookPage() {
  const [activeTab, setActiveTab] = useState("create");
  const [historyKey, setHistoryKey] = useState(0);

  const memberRole = useAuthStore((s) => s.memberRole);
  const canConnect = memberRole === "admin";
  const companyId = useAuthStore((s) => s.companyId);

  const searchParams = useSearchParams();
  const router = useRouter();

  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [link, setLink] = useState("");

  const loadAccount = async () => {
    try {
      if (!companyId) return;
      const q = query(
        collection(db, "socialAccounts"),
        where("companyId", "==", companyId),
        where("platform", "==", "facebook"),
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
      toast.error("Error al cargar la cuenta de Facebook");
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
      toast.success("Cuenta de Facebook conectada");
      loadAccount();
      router.replace("/dashboard/facebook");
    }

    if (error) {
      toast.error("Error al conectar la cuenta");
      router.replace("/dashboard/facebook");
    }
  }, [searchParams]);

  const handlePublish = async () => {
    if (!account) return;
    if (!message.trim() && !imageUrl && !videoUrl) return;

    setLoading(true);
    const tid = toast.loading("Publicando en Facebook…");
    try {
      const res = await fetch("/api/publish/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: account.pageId,
          companyId,
          accessToken: account.accessToken,
          pageName: account.name,
          message,
          link: link || undefined,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al publicar");

      toast.success("Publicado correctamente en Facebook", { id: tid });
      setMessage("");
      setImageUrl(null);
      setVideoUrl(null);
      setLink("");
      setHistoryKey((k) => k + 1);
    } catch (err: any) {
      const msg = err.message || "Error al publicar";
      if (
        msg === "TOKEN_EXPIRED" ||
        msg.toLowerCase().includes("token") ||
        msg.includes("401")
      ) {
        toast.error("El token expiró o es inválido. Reconecta la cuenta.", {
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
    if (!account) return;
    setDisconnecting(true);
    const tid = toast.loading("Desconectando…");
    try {
      await deleteDoc(doc(db, "socialAccounts", account.id));
      setAccount(null);
      setDisconnectOpen(false);
      toast.success("Cuenta desconectada", { id: tid });
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
      <div className="p-6 text-muted-foreground">No hay empresa asociada.</div>
    );
  }

  if (!account) {
    return (
      <FacebookConnectFlow
        companyId={companyId}
        canConnect={canConnect}
        status={null}
      />
    );
  }

  const tokenStatus = getTokenStatus(account.expiresAt);

  return (
    <div>
      <div className="flex items-center justify-between bg-zinc-950/50">
        <div className="p-6 text-white">
          <h1 className="text-2xl font-bold">Facebook</h1>
          <p className="text-sm">
            Publicando como{" "}
            <span className="font-bold text-white">{account.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 px-6">
          {tokenStatus === "expired" ? (
            <Badge variant="destructive">Token expirado</Badge>
          ) : tokenStatus === "expiring_soon" ? (
            <Badge className="bg-amber-500 hover:bg-amber-500">
              Por vencer
            </Badge>
          ) : (
            <Badge variant="secondary">Conectado</Badge>
          )}
          {canConnect && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisconnectOpen(true)}
            >
              Desconectar
            </Button>
          )}
        </div>
      </div>

      {tokenStatus !== "ok" && (
        <div
          className={`mx-6 mt-4 p-3 rounded-md text-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
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
                window.location.href = `/api/auth/facebook?companyId=${companyId}`;
              }}
            >
              Reconectar Facebook
            </Button>
          )}
        </div>
      )}

      <div className="w-full h-full p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="create">Crear contenido</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className={activeTab === "create" ? "mt-6 block" : "hidden"}>
          <FacebookComposer
            pageName={account.name}
            loading={loading}
            message={message}
            onMessageChange={setMessage}
            imageUrl={imageUrl}
            onImageChange={setImageUrl}
            videoUrl={videoUrl}
            onVideoChange={setVideoUrl}
            link={link}
            companyId={companyId}
            onLinkChange={setLink}
            onPublish={handlePublish}
          />
        </div>

        <div className={activeTab === "history" ? "mt-6 block" : "hidden"}>
          <PostHistory
            pageId={account.pageId}
            platform="facebook"
            key={historyKey}
          />
        </div>
      </div>

      <ConfirmDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title="¿Desconectar Facebook?"
        description="Dejarás de poder publicar hasta volver a conectar la página."
        confirmLabel="Desconectar"
        destructive
        loading={disconnecting}
        onConfirm={performDisconnect}
      />
    </div>
  );
}
