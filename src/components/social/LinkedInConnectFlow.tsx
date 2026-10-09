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

const credId = (companyId: string) => `${companyId}_linkedin`;

export function LinkedInConnectFlow({
  companyId,
  canConnect,
  status,
}: {
  companyId: string;
  canConnect: boolean;
  status: { type: "success" | "error"; text: string } | null;
}) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
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
          setClientId(d.clientId || d.appId || "");
          setClientSecret(d.clientSecret || d.appSecret || "");
          setHasCreds(
            !!((d.clientId || d.appId) && (d.clientSecret || d.appSecret)),
          );
        }
      } catch (e) {
        console.error("Error cargando credenciales LinkedIn:", e);
      }
    };
    load();
  }, [companyId, canConnect]);

  const saveCreds = async () => {
    if (!canConnect) return;
    if (!clientId.trim() || !clientSecret.trim()) {
      setMsg("Client ID y Client Secret son obligatorios");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await setDoc(doc(db, "platformCredentials", credId(companyId)), {
        companyId,
        platform: "linkedin",
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
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

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`;

  return (
    <div className="flex-1 flex flex-col space-y-6 p-6 max-w-lg">
      <div>
        <h2 className="text-2xl font-bold">LinkedIn</h2>
        <p className="text-muted-foreground mt-1">
          Configura la app de LinkedIn de tu empresa y conecta el perfil
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

      <Card className="bg-white/70">
        <CardHeader>
          <CardTitle>1. Credenciales LinkedIn</CardTitle>
          <CardDescription>
            Crea una app en{" "}
            <a
              href="https://www.linkedin.com/developers/apps"
              target="_blank"
              rel="noreferrer"
              className="underline font-bold"
            >
              LinkedIn Developers
            </a>
            . Redirect URL:{" "}
            <code className="text-xs break-all">{redirectUri}</code>
            <br />
            Scopes: <code>openid profile email w_member_social</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Client ID</Label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={!canConnect || saving}
              className="bg-white"
            />
          </div>
          <div className="space-y-1">
            <Label>Client Secret</Label>
            <Input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
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

      <Card className="bg-white/70">
        <CardHeader>
          <CardTitle>2. Conectar perfil</CardTitle>
          <CardDescription>
            Se publicará desde el perfil personal autorizado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            disabled={!hasCreds || !canConnect}
            onClick={() => {
              window.location.href = `/api/auth/linkedin?companyId=${companyId}`;
            }}
          >
            Conectar LinkedIn
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
  );
}
