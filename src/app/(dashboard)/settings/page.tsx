"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { getAiUsage } from "@/lib/tenant";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X } from "lucide-react";

export default function SettingsPage() {
  const {
    companyId,
    companyName,
    companyLogo,
    memberRole,
    setTenant,
    aiEnabled,
    aiCaptionsLimit,
    aiImagesLimit,
    plan,
  } = useAuthStore();

  const [name, setName] = useState(companyName || "");
  const [logoUrl, setLogoUrl] = useState<string | null>(companyLogo || null);
  const [aiInstructions, setAiInstructions] = useState("");
  const [usage, setUsage] = useState({ aiCaptions: 0, aiImages: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const canEdit = memberRole === "admin" || memberRole === "editor";

  useEffect(() => {
    const load = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "companies", companyId));
        if (snap.exists()) {
          const d = snap.data();
          setName(d.name || "");
          setLogoUrl(d.logoUrl || null);
          setAiInstructions(d.aiInstructions || "");
        }
        try {
          const u = await getAiUsage(companyId);
          setUsage({ aiCaptions: u.aiCaptions, aiImages: u.aiImages });
        } catch {
          // usage opcional
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  const uploadLogo = async (file: File) => {
    if (!companyId) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "brand");
    formData.append("companyId", companyId);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al subir el logo");
    }
    const data = await res.json();
    return data.publicUrl as string;
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Solo imágenes" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Máximo 2MB" });
      return;
    }
    try {
      setUploading(true);
      setMessage(null);
      const url = await uploadLogo(file);
      if (url) setLogoUrl(url);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!companyId || !canEdit) return;
    if (!name.trim()) {
      setMessage({ type: "error", text: "El nombre es obligatorio" });
      return;
    }
    try {
      setSaving(true);
      setMessage(null);
      await updateDoc(doc(db, "companies", companyId), {
        name: name.trim(),
        logoUrl: logoUrl || null,
        aiInstructions: aiInstructions.trim(),
      });
      setTenant({
        companyId,
        companyName: name.trim(),
        companyLogo: logoUrl,
        memberRole,
        plan,
        aiEnabled,
        aiCaptionsLimit,
        aiImagesLimit,
      });
      setMessage({ type: "success", text: "Configuración guardada" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error al guardar" });
    } finally {
      setSaving(false);
    }
  };

  if (!companyId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          No hay empresa asociada a tu cuenta.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="p-6 bg-yellow-500/20">
        <h2 className="text-2xl font-bold">Configuración</h2>
        <p className="text-muted-foreground mt-1">
          Datos de tu empresa e instrucciones para la IA
        </p>
      </div>

      <div className="p-6 max-w-2xl space-y-6">
        {!name.trim() && (
          <div className="p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-sm">
            Completa el nombre de tu empresa para personalizar la app.
          </div>
        )}

        {message && (
          <div
            className={`p-3 rounded-md text-sm border ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <Card className="bg-white/70">
          <CardHeader>
            <CardTitle>Empresa</CardTitle>
            <CardDescription>
              Nombre y logo que verás en el panel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Nombre</Label>
              <Input
                id="company-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Acme Marketing"
                disabled={!canEdit || saving}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-md border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Sin logo
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                    disabled={!canEdit || uploading || saving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canEdit || uploading || saving}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Subir logo
                  </Button>
                  {logoUrl && canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogoUrl(null)}
                      disabled={saving}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Quitar
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">PNG/JPG, máx. 2MB</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70">
          <CardHeader>
            <CardTitle>Instrucciones para la IA</CardTitle>
            <CardDescription>
              Se usarán al generar captions e imágenes (si tu plan incluye IA)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="Ej. Somos una marca de tecnología B2B. Tono profesional y cercano..."
              rows={6}
              disabled={!canEdit || saving}
              className="bg-white resize-none"
            />
            {aiEnabled ? (
              <p className="text-xs text-muted-foreground">
                Uso este mes: {usage.aiCaptions}/{aiCaptionsLimit} captions ·{" "}
                {usage.aiImages}/{aiImagesLimit} imágenes
                {plan ? ` · Plan: ${plan}` : ""}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tu plan no incluye IA.
              </p>
            )}
          </CardContent>
        </Card>

        {canEdit && (
          <Button
            onClick={handleSave}
            disabled={saving || uploading}
            className="bg-gradient-to-r from-orange-400 to-yellow-500 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        )}

        {!canEdit && (
          <p className="text-sm text-muted-foreground">
            Solo administradores o editores pueden modificar la configuración.
          </p>
        )}
      </div>
    </div>
  );
}
