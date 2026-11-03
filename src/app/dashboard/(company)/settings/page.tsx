"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { getAiUsage } from "@/lib/tenant";
import { toast } from "sonner";
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
  const companyId = useAuthStore((s) => s.companyId);
  const companyName = useAuthStore((s) => s.companyName);
  const companyLogo = useAuthStore((s) => s.companyLogo);
  const memberRole = useAuthStore((s) => s.memberRole);
  const setTenant = useAuthStore((s) => s.setTenant);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const aiCaptionsLimit = useAuthStore((s) => s.aiCaptionsLimit);
  const aiImagesLimit = useAuthStore((s) => s.aiImagesLimit);
  const plan = useAuthStore((s) => s.plan);

  const [name, setName] = useState(companyName || "");
  const [logoUrl, setLogoUrl] = useState<string | null>(companyLogo || null);
  const [aiInstructions, setAiInstructions] = useState("");
  const [usage, setUsage] = useState({ aiCaptions: 0, aiImages: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
          /* usage opcional */
        }
      } catch (e) {
        console.error(e);
        toast.error("Error al cargar la configuración");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  const uploadLogo = async (file: File) => {
    if (!companyId) {
      throw new Error(
        "No hay empresa asociada. Recarga la página o vuelve a iniciar sesión.",
      );
    }
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
      toast.error("Solo imágenes");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Máximo 2MB");
      return;
    }
    setUploading(true);
    const tid = toast.loading("Subiendo logo…");
    try {
      const url = await uploadLogo(file);
      setLogoUrl(url);
      toast.success("Logo actualizado", { id: tid });
    } catch (err: any) {
      toast.error(err.message || "Error al subir", { id: tid });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!companyId || !canEdit) return;
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    // Snapshot del store actual para no pisar plan / límites / rol
    const current = useAuthStore.getState();

    setSaving(true);
    const tid = toast.loading("Guardando…");
    try {
      await updateDoc(doc(db, "companies", companyId), {
        name: name.trim(),
        logoUrl: logoUrl || null,
        aiInstructions: aiInstructions.trim(),
      });

      setTenant({
        companyId,
        companyName: name.trim(),
        companyLogo: logoUrl,
        memberRole: current.memberRole,
        plan: current.plan,
        aiEnabled: current.aiEnabled,
        aiCaptionsLimit: current.aiCaptionsLimit,
        aiImagesLimit: current.aiImagesLimit,
      });

      toast.success("Configuración guardada", { id: tid });
    } catch (err: any) {
      toast.error(err.message || "Error al guardar", { id: tid });
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
      <div className="flex items-center justify-between bg-zinc-950/50">
        <div className="p-6 text-white">
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-sm">
            Datos de tu empresa e instrucciones para la IA
          </p>
        </div>
      </div>

      <div className="p-6 max-w-2xl space-y-6">
        {!name.trim() && (
          <div className="p-3 rounded-md border border-amber-400 bg-black text-amber-400 text-sm">
            Completa el nombre de tu empresa para personalizar la app.
          </div>
        )}

        <Card className="bg-zinc-950/60">
          <CardHeader>
            <CardTitle className="text-white">Empresa</CardTitle>
            <CardDescription className="text-white/50">
              Nombre y logo que verás en el panel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white" htmlFor="company-name">
                Nombre
              </Label>
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
              <Label className="text-white">Logo</Label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-md border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
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
                      className="text-white"
                    >
                      <X className="h-4 w-4 mr-1 " />
                      Quitar
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-white/50">PNG/JPG, máx. 2MB</p>
            </div>
          </CardContent>
        </Card>
        {aiEnabled && (
          <Card className="bg-zinc-950/60">
            <CardHeader>
              <CardTitle className="text-white">
                Instrucciones para la IA
              </CardTitle>
              <CardDescription className="text-white/50">
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
                className="bg-white text-black resize-none"
              />

              <p className="text-xs text-white/50">
                Uso este mes: {usage.aiCaptions}/{aiCaptionsLimit} captions ·{" "}
                {usage.aiImages}/{aiImagesLimit} imágenes
                {plan ? ` · Plan: ${plan}` : ""}
              </p>
            </CardContent>
          </Card>
        )}

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
