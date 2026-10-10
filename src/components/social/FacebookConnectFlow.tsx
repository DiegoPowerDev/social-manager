"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import TitleComponent from "../layout/titleComponent";

const credId = (companyId: string) => `${companyId}_facebook`;

export function FacebookConnectFlow({
  companyId,
  canConnect,
  status,
}: {
  companyId: string;
  canConnect: boolean;
  status: { type: "success" | "error"; text: string } | null;
}) {
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [hasCreds, setHasCreds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !canConnect) return;

    const load = async () => {
      try {
        const snap = await getDoc(
          doc(db, "platformCredentials", credId(companyId)),
        );
        if (snap.exists()) {
          const d = snap.data();
          setAppId(d.appId || "");
          setAppSecret(d.appSecret || "");
          setHasCreds(!!(d.appId && d.appSecret));
        }
      } catch (e) {
        console.error("Error cargando credenciales FB:", e);
      }
    };
    load();
  }, [companyId, canConnect]);

  const saveCreds = async () => {
    if (!canConnect) return;
    if (!appId.trim() || !appSecret.trim()) {
      setMsg("App ID y App Secret son obligatorios");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await setDoc(doc(db, "platformCredentials", credId(companyId)), {
        companyId,
        platform: "facebook",
        appId: appId.trim(),
        appSecret: appSecret.trim(),
        updatedAt: serverTimestamp(),
      });
      setHasCreds(true);
      setMsg("Credenciales guardadas");
    } catch (e: any) {
      setMsg(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      <TitleComponent
        title="Facebook"
        description="Configura la app de Meta de tu empresa y conecta la página"
      />

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
      <div className="flex flex-col w-full items-center gap-8">
        <Card className="bg-white/70 w-xl">
          <CardHeader>
            <CardTitle>1. Credenciales Meta</CardTitle>
            <CardDescription>
              App ID y App Secret de{" "}
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noreferrer"
                className="underline font-bold"
              >
                Meta for Developers
              </a>
              . Redirect URI:{" "}
              <code className="text-xs">
                {process.env.NEXT_PUBLIC_APP_URL}
                /api/auth/facebook/callback
              </code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>App ID</Label>
              <Input
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                disabled={!canConnect || saving}
                className="bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label>App Secret</Label>
              <Input
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                disabled={!canConnect || saving}
                className="bg-white"
              />
            </div>
            {canConnect && (
              <Button onClick={saveCreds} disabled={saving}>
                {saving ? "Guardando..." : "Guardar credenciales"}
              </Button>
            )}
            {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
          </CardContent>
        </Card>

        <Card className="bg-white/70 w-xl">
          <CardHeader>
            <CardTitle>2. Conectar página</CardTitle>
            <CardDescription>
              Necesitas una Página de Facebook para publicar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              disabled={!hasCreds || !canConnect}
              onClick={() => {
                window.location.href = `/api/auth/facebook?companyId=${companyId}`;
              }}
            >
              Conectar Facebook
            </Button>
            {!hasCreds && (
              <p className="text-xs text-muted-foreground mt-2">
                Guarda las credenciales antes de conectar
              </p>
            )}
            {!canConnect && (
              <p className="text-xs text-muted-foreground mt-2">
                Solo un administrador puede conectar redes
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
