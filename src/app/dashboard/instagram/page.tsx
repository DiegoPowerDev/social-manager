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
import { InstagramComposer } from "@/components/social/InstagramComposer";
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
import { LucideLoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { InstagramConnectFlow } from "@/components/social/InstagramConnectFlow";

export default function InstagramPage() {
  const [activeTab, setActiveTab] = useState("create");

  const searchParams = useSearchParams();
  const router = useRouter();

  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Estado del post (controlado)
  const [mediaType, setMediaType] = useState<"FEED" | "REELS" | "STORIES">(
    "FEED",
  );

  const companyId = useAuthStore((s) => s.companyId);

  const memberRole = useAuthStore((s) => s.memberRole);
  const canEdit = memberRole === "admin" || memberRole === "editor";
  const canConnect = memberRole === "admin";
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const loadAccount = async () => {
    try {
      if (!companyId) {
        return;
      }
      const q = query(
        collection(db, "socialAccounts"),
        where("companyId", "==", companyId),
        where("platform", "==", "instagram"),
      );
      console.log(memberRole);
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
      setStatus({ type: "success", text: "Cuenta de Instagram conectada" });
      loadAccount();
      router.replace("/instagram");
    }

    if (error) {
      setStatus({ type: "error", text: "Error al conectar la cuenta" });
      router.replace("/instagram");
    }
  }, [searchParams]);

  const handlePublish = async () => {
    if (!account || !companyId || !canEdit) return;
    if (!caption.trim() && !imageUrl && !videoUrl) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/publish/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          igUserId: account.igUserId,
          accessToken: account.accessToken,
          username: account.username,
          companyId,
          caption,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
          mediaType,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al publicar");

      setStatus({
        type: "success",
        text: "Publicado correctamente en Instagram",
      });

      // Limpiar solo después de publicar
      setCaption("");
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
        setStatus({ type: "error", text: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!account || !confirm("¿Desconectar esta cuenta de Instagram?")) return;
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
        No hay empresa asociada. Completa el acceso o recarga la página.
      </div>
    );
  }

  if (!account) {
    return (
      <InstagramConnectFlow
        companyId={companyId}
        canConnect={canConnect}
        status={status}
      />
    );
  }

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center justify-between bg-yellow-500/20 p-6">
        <div>
          <h2 className="text-2xl font-bold">Instagram</h2>
          <p className=" mt-1">
            Publicando como{" "}
            <span className="font-medium ">@{account.username}</span>
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
            disabled={!canConnect}
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                window.location.href = `/api/auth/instagram?companyId=${companyId}`;
              }}
            >
              Reconectar Instagram
            </Button>
          </div>
        );
      })()}
      {!canEdit && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-md mb-4">
          Tu rol es solo lectura. No puedes publicar ni desconectar.
        </p>
      )}
      <div className="w-full h-full p-6">
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

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full "
        >
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-yellow-500/60 font-bold backdrop-blur-xs">
            <TabsTrigger value="create">Crear contenido</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* TAB: Crear */}
        <div className={cn(activeTab === "create" ? "mt-6 block" : "hidden")}>
          {!canEdit ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-md mb-4">
              Tu rol es solo lectura. No puedes publicar ni desconectar.
            </p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <InstagramComposer
                  username={account.username}
                  loading={loading}
                  caption={caption}
                  onCaptionChange={setCaption}
                  imageUrl={imageUrl}
                  onImageChange={setImageUrl}
                  videoUrl={videoUrl}
                  onVideoChange={setVideoUrl}
                  mediaType={mediaType}
                  onMediaTypeChange={setMediaType}
                  onPublish={handlePublish}
                />
              </div>

              <div>
                <PostPreview
                  platform="instagram"
                  accountName={account.username}
                  message={caption}
                  imageUrl={imageUrl}
                  videoUrl={videoUrl}
                />
              </div>
            </div>
          )}
        </div>

        {/* Historial - siempre montado, solo se oculta */}
        <div className={activeTab === "history" ? "mt-6 block" : "hidden"}>
          <PostHistory
            pageId={account.igUserId}
            platform="instagram"
            key={status?.type === "success" ? Date.now() : "history"}
          />
        </div>
      </div>
    </div>
  );
}
