"use client";

import { useEffect, useState } from "react";
import { getTokenStatus, tokenStatusLabel } from "@/lib/tokenStatus";
import { useSearchParams, useRouter, redirect } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { TikTokConnectFlow } from "@/components/social/TikTokConnectFlow";
import {
  TikTokComposer,
  type TikTokPrivacy,
} from "@/components/social/TikTokComposer";
import { PostHistory } from "@/components/social/PostHistory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LucideLoaderCircle } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { planAtLeast } from "@/content/menu";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";

export default function TikTokPage() {
  const [activeTab, setActiveTab] = useState("create");
  const [historyKey, setHistoryKey] = useState(0);
  const searchParams = useSearchParams();
  const router = useRouter();

  const plan = useAuthStore((s) => s.plan);
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
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [privacyLevel, setPrivacyLevel] = useState("");

  const loadAccount = async () => {
    try {
      if (!companyId) return;
      const q = query(
        collection(db, "socialAccounts"),
        where("companyId", "==", companyId),
        where("platform", "==", "tiktok"),
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
      toast.error("Error al cargar la cuenta de TikTok");
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
      toast.success("Cuenta de TikTok conectada");
      loadAccount();
      router.replace("/dashboard/tiktok");
    }
    if (error) {
      toast.error(`Error al conectar: ${error}`);
      router.replace("/dashboard/tiktok");
    }
  }, [searchParams]);

  const handlePublish = async (meta: {
    privacyLevel: string;
    disableComment: boolean;
    disableDuet: boolean;
    disableStitch: boolean;
    brandContentToggle: boolean;
    brandOrganicToggle: boolean;
    commercialDisclosure: boolean;
  }) => {
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
      toast.error("El caption es obligatorio");
      return;
    }

    setLoading(true);
    const tid = toast.loading("Publicando en TikTok…");
    try {
      const res = await fetch("/api/publish/tiktok", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
        },
        body: JSON.stringify({
          companyId,
          openId: account.openId,
          name: account.name,
          title,
          videoUrl,
          privacyLevel: meta.privacyLevel,
          disableComment: meta.disableComment,
          disableDuet: meta.disableDuet,
          disableStitch: meta.disableStitch,
          brandContentToggle: meta.brandContentToggle,
          brandOrganicToggle: meta.brandOrganicToggle,
          commercialDisclosure: meta.commercialDisclosure,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al publicar");

      toast.success("Video enviado a TikTok", { id: tid });
      setTitle("");
      setVideoUrl(null);
      setHistoryKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err.message || "Error al publicar", { id: tid });
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
  if (!planAtLeast(plan, "premium")) {
    redirect("/dashboard/membresia");
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
      <TikTokConnectFlow
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
          <h1 className="text-2xl font-bold">TikTok</h1>
          <p className="text-sm">
            Cuenta:{" "}
            <span className="font-bold text-white">
              {account.name || account.username || account.openId}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 pr-6">
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
          className={`mx-6 p-3 mt-4 rounded-md text-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
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
                window.location.href = `/api/auth/tiktok?companyId=${companyId}`;
              }}
            >
              Reconectar TikTok
            </Button>
          )}
        </div>
      )}

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="create">Publicar video</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className={cn(activeTab === "create" ? "mt-6 block" : "hidden")}>
          {!canEdit ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-md">
              Tu rol es solo lectura.
            </p>
          ) : (
            <TikTokComposer
              accountName={account.name || account.username || "TikTok"}
              loading={loading}
              title={title}
              onTitleChange={setTitle}
              videoUrl={videoUrl}
              onVideoChange={setVideoUrl}
              privacyLevel={privacyLevel}
              onPrivacyChange={setPrivacyLevel}
              onPublish={handlePublish}
            />
          )}
        </div>

        <div className={activeTab === "history" ? "mt-6 block" : "hidden"}>
          <PostHistory
            pageId={account.openId}
            platform="tiktok"
            key={historyKey}
          />
        </div>
      </div>

      <ConfirmDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title="¿Desconectar TikTok?"
        description="Dejarás de poder publicar hasta volver a conectar la cuenta."
        confirmLabel="Desconectar"
        destructive
        loading={disconnecting}
        onConfirm={performDisconnect}
      />
    </div>
  );
}
