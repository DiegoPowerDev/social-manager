"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LucideLoaderCircle } from "lucide-react";

type CompanyRow = {
  id: string;
  name?: string;
  plan?: string;
  planStatus?: string;
  planSource?: string;
  features?: { aiEnabled?: boolean };
  limits?: { aiCaptionsPerMonth?: number; aiImagesPerMonth?: number };
  paypalSubscriptionId?: string | null;
  nextBillingTime?: string | null;
  courtesy?: {
    active?: boolean;
    plan?: string;
    until?: string | null;
    reason?: string;
  };
  partner?: {
    active?: boolean;
    tier?: string;
    until?: string | null;
    reason?: string;
  };
};

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function formatUntil(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function getListBadges(c: CompanyRow) {
  const now = Date.now();
  const courtesyOn =
    !!c.courtesy?.active &&
    !!c.courtesy?.until &&
    new Date(c.courtesy.until).getTime() > now;
  const partnerOn =
    !!c.partner?.active &&
    (!c.partner?.until || new Date(c.partner.until).getTime() > now);

  let effective = (c.plan || "free") as string;
  if (courtesyOn) effective = c.courtesy?.plan || "premium";
  else if (partnerOn) effective = c.partner?.tier || "premium";

  const billing = c.paypalSubscriptionId
    ? c.plan || "free"
    : c.planSource === "partner"
      ? "free"
      : c.plan || "free";

  return {
    billing,
    effective,
    courtesyOn,
    partnerOn,
    partnerTier: c.partner?.tier || "premium",
  };
}

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = useAuthStore((s) => s.appUser?.isSuperAdmin === true);

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [captionsUsed, setCaptionsUsed] = useState(0);
  const [imagesUsed, setImagesUsed] = useState(0);

  const [partnerReason, setPartnerReason] = useState("");
  const [partnerTier, setPartnerTier] = useState<"basic" | "premium">(
    "premium",
  );
  const [courtesyReason, setCourtesyReason] = useState("");
  const [courtesyPlan, setCourtesyPlan] = useState("premium");

  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [courtesyModalOpen, setCourtesyModalOpen] = useState(false);

  const headers = () => ({
    "Content-Type": "application/json",
    "x-user-uid": user?.uid || "",
  });

  const loadList = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/companies", { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setCompanies(data.companies || []);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace("/dashboard");
      return;
    }
    loadList();
  }, [isSuperAdmin, loadList, router]);

  const openCompany = async (id: string) => {
    setSelectedId(id);
    setMsg(null);
    const res = await fetch(`/api/admin/companies/${id}`, {
      headers: headers(),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error);
      return;
    }
    setDetail(data);
    const c = data.company;
    setCaptionsUsed(data.usage?.aiCaptions ?? 0);
    setImagesUsed(data.usage?.aiImages ?? 0);
    setCourtesyReason(c.courtesy?.reason || "");
    setCourtesyPlan(c.courtesy?.plan || "premium");
    setPartnerReason(c.partner?.reason || "");
    setPartnerTier((c.partner?.tier as "basic" | "premium") || "premium");
  };

  const saveUsage = async (reset = false) => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/companies/${selectedId}/usage`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(
          reset
            ? { reset: true }
            : { aiCaptions: captionsUsed, aiImages: imagesUsed },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(reset ? "Uso de IA reseteado" : "Uso de IA actualizado");
      await openCompany(selectedId);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const grantCourtesy = async (days: number) => {
    if (!selectedId) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/companies/${selectedId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({
          courtesy: {
            active: true,
            plan: courtesyPlan,
            until: addDaysIso(days),
            reason: courtesyReason || `Cortesía ${days} días`,
            limits: {
              aiCaptionsPerMonth: courtesyPlan === "premium" ? 150 : 100,
              aiImagesPerMonth: courtesyPlan === "premium" ? 50 : 30,
            },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`Cortesía activa: ${days} días (${courtesyPlan})`);
      await openCompany(selectedId);
      await loadList();
      useAuthStore.getState().invalidateTenant();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const clearCourtesy = async () => {
    if (!selectedId) return;
    if (!confirm("¿Quitar la cortesía de esta empresa?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/companies/${selectedId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ courtesy: { active: false } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg("Cortesía eliminada");
      await openCompany(selectedId);
      await loadList();
      useAuthStore.getState().invalidateTenant();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const savePartner = async (active: boolean): Promise<boolean> => {
    if (!selectedId) return false;
    if (active && !partnerReason.trim()) {
      setMsg("Indica un motivo para marcar como Socio");
      return false;
    }
    setSaving(true);
    setMsg(null);
    try {
      const noPaypal = !detail?.company?.paypalSubscriptionId;
      const res = await fetch(`/api/admin/companies/${selectedId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(
          active
            ? {
                partner: {
                  active: true,
                  tier: partnerTier,
                  reason: partnerReason.trim(),
                  until: null,
                  limits: {
                    aiCaptionsPerMonth: partnerTier === "basic" ? 100 : 150,
                    aiImagesPerMonth: partnerTier === "basic" ? 30 : 50,
                  },
                },
                ...(noPaypal
                  ? {
                      plan: "free",
                      planStatus: "active",
                      planSource: "partner",
                    }
                  : {}),
              }
            : {
                partner: { active: false },
                ...(noPaypal ? { planSource: "free" } : {}),
              },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(active ? "Marcado como Socio" : "Socio desactivado");
      await openCompany(selectedId);
      await loadList();
      useAuthStore.getState().invalidateTenant();
      return true;
    } catch (e: any) {
      setMsg(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const courtesy = detail?.company?.courtesy;
  const courtesyActive =
    !!courtesy?.active &&
    !!courtesy?.until &&
    new Date(courtesy.until).getTime() > Date.now();

  const partner = detail?.company?.partner;
  const partnerActive =
    !!partner?.active &&
    (!partner?.until || new Date(partner.until).getTime() > Date.now());

  if (!isSuperAdmin) {
    return (
      <div className="p-6 flex justify-center">
        <LucideLoaderCircle className="h-10 w-10 animate-spin text-yellow-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-zinc-950/50 backdrop-blur">
        <div className="p-6 text-white">
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm">Empresas, socios, cortesía y cupos de IA</p>
        </div>
      </div>

      {msg && (
        <p className="mx-6 text-sm rounded-md border border-white/20 bg-white/10 px-3 py-2">
          {msg}
        </p>
      )}

      <div className="p-6 grid gap-6 lg:grid-cols-2">
        {/* Lista */}
        <Card className="bg-white/70 h-fit">
          <CardHeader>
            <CardTitle>Empresas</CardTitle>
            <CardDescription>Hasta 100 más recientes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LucideLoaderCircle className="h-8 w-8 animate-spin" />
            ) : (
              <ul className="space-y-2 max-h-[70vh] overflow-y-auto">
                {companies.map((c) => {
                  const b = getListBadges(c);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => openCompany(c.id)}
                        className={`w-full text-left rounded-lg border p-3 hover:bg-white/80 ${
                          selectedId === c.id
                            ? "ring-2 ring-amber-400"
                            : "bg-white/50"
                        }`}
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium truncate">
                            {c.name || "(sin nombre)"}
                          </span>
                          <div className="flex flex-wrap gap-1 shrink-0 justify-end">
                            <Badge variant="secondary" className="capitalize">
                              {b.billing}
                            </Badge>
                            {b.partnerOn && (
                              <Badge className="bg-violet-500/20 text-violet-900 border-violet-500/30 capitalize">
                                Socio · {b.partnerTier}
                              </Badge>
                            )}
                            {b.courtesyOn && (
                              <Badge className="bg-emerald-500/20 text-emerald-800 border-emerald-500/30">
                                Cortesía
                              </Badge>
                            )}
                            {(b.partnerOn || b.courtesyOn) &&
                              b.effective !== b.billing && (
                                <Badge className="bg-amber-500/15 text-amber-900 capitalize">
                                  Acceso: {b.effective}
                                </Badge>
                              )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Detalle */}
        <Card className="bg-white/70">
          <CardHeader>
            <CardTitle>Detalle</CardTitle>
            <CardDescription>
              {selectedId ? "" : "Selecciona una empresa"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!detail ? (
              <p className="text-sm text-muted-foreground">
                Ninguna seleccionada
              </p>
            ) : (
              <>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Nombre: </span>
                    {detail.company?.name || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Plan facturación:{" "}
                    </span>
                    <span className="capitalize">
                      {detail.company?.plan || "free"}
                    </span>
                    {detail.company?.planSource && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({detail.company.planSource})
                      </span>
                    )}
                  </p>
                  <p>
                    <span className="text-muted-foreground">PayPal sub: </span>
                    {detail.company?.paypalSubscriptionId || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Periodo uso: </span>
                    {detail.period}
                  </p>
                </div>

                {/* Socio — resumen */}
                <div className="rounded-lg border border-violet-200/70 bg-violet-50/50 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Socio (acceso manual)</p>
                    {partnerActive ? (
                      <Badge className="bg-violet-500/20 text-violet-900 capitalize">
                        {partner?.tier || "premium"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Amigos, pilotos o acuerdos. No es cobro PayPal. Sin
                    suscripción, la facturación queda en free.
                  </p>
                  {partnerActive && partner?.reason && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">Motivo: </span>
                      {partner.reason}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (partnerActive) {
                        setPartnerReason(partner?.reason || "");
                        setPartnerTier(
                          (partner?.tier as "basic" | "premium") || "premium",
                        );
                      } else {
                        setPartnerReason("");
                        setPartnerTier("premium");
                      }
                      setPartnerModalOpen(true);
                    }}
                  >
                    {partnerActive ? "Editar socio" : "Marcar como socio"}
                  </Button>
                </div>

                {/* Cortesía — resumen */}
                <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Cortesía</p>
                    {courtesyActive ? (
                      <Badge className="bg-emerald-500/20 text-emerald-800">
                        Hasta {formatUntil(courtesy.until)}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactiva</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Compensación temporal con fecha de fin. No cancela cobros de
                    PayPal.
                  </p>
                  {courtesyActive && courtesy?.reason && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">Motivo: </span>
                      {courtesy.reason}
                    </p>
                  )}
                  {courtesyActive && (
                    <p className="text-xs capitalize">
                      <span className="text-muted-foreground">Plan: </span>
                      {courtesy?.plan || "premium"}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCourtesyModalOpen(true)}
                  >
                    {courtesyActive ? "Editar cortesía" : "Otorgar cortesía"}
                  </Button>
                </div>

                <hr className="border-white/30" />

                <p className="text-sm font-medium">Uso IA este mes</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Captions usados</Label>
                    <Input
                      type="number"
                      className="bg-white"
                      value={captionsUsed}
                      onChange={(e) => setCaptionsUsed(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Imágenes usadas</Label>
                    <Input
                      type="number"
                      className="bg-white"
                      value={imagesUsed}
                      onChange={(e) => setImagesUsed(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={saving}
                    onClick={() => saveUsage(false)}
                  >
                    Guardar uso
                  </Button>
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() => saveUsage(true)}
                  >
                    Reset uso a 0
                  </Button>
                </div>

                <hr className="border-white/30" />

                <p className="text-sm font-medium">Miembros</p>
                <ul className="text-sm space-y-1">
                  {(detail.members || []).map((m: any) => (
                    <li key={m.id} className="flex justify-between gap-2">
                      <span className="truncate">{m.email}</span>
                      <Badge variant="outline" className="capitalize">
                        {m.role}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Socio */}
      {partnerModalOpen && selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-lg max-w-md w-full p-6 space-y-4 border">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Socio (acceso manual)</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPartnerModalOpen(false)}
              >
                Cerrar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No es un cobro PayPal. Otorgas beneficios basic o premium. Si no
              hay suscripción, la facturación se dejará en free.
            </p>
            <div>
              <Label>Beneficios equivalentes a</Label>
              <Select
                value={partnerTier}
                onValueChange={(v) => setPartnerTier(v as "basic" | "premium")}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">basic</SelectItem>
                  <SelectItem value="premium">premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo (obligatorio)</Label>
              <Input
                className="bg-white"
                value={partnerReason}
                onChange={(e) => setPartnerReason(e.target.value)}
                placeholder="amigo / piloto / acuerdo"
              />
              {!partnerReason.trim() && (
                <p className="text-xs text-red-600 mt-1">
                  El motivo es obligatorio
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {partnerActive && (
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700"
                  disabled={saving}
                  onClick={async () => {
                    const ok = await savePartner(false);
                    if (ok) setPartnerModalOpen(false);
                  }}
                >
                  Quitar socio
                </Button>
              )}
              <Button
                disabled={saving || !partnerReason.trim()}
                className="bg-violet-600 hover:bg-violet-700 text-white"
                onClick={async () => {
                  const ok = await savePartner(true);
                  if (ok) setPartnerModalOpen(false);
                }}
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cortesía */}
      {courtesyModalOpen && selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-lg max-w-md w-full p-6 space-y-4 border">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Cortesía</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCourtesyModalOpen(false)}
              >
                Cerrar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Compensación temporal con fecha de fin. No cancela cobros de
              PayPal.
            </p>
            <div>
              <Label>Plan durante la cortesía</Label>
              <Select
                value={courtesyPlan}
                onValueChange={(v) => setCourtesyPlan(v as any)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">basic</SelectItem>
                  <SelectItem value="premium">premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo</Label>
              <Input
                className="bg-white"
                value={courtesyReason}
                onChange={(e) => setCourtesyReason(e.target.value)}
                placeholder="Ej: caída Meta / compensación"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 60].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  disabled={saving}
                  className="bg-gradient-to-r from-orange-400 to-yellow-500 text-white"
                  onClick={async () => {
                    await grantCourtesy(d);
                    setCourtesyModalOpen(false);
                  }}
                >
                  +{d} días
                </Button>
              ))}
            </div>
            {courtesyActive && (
              <Button
                variant="outline"
                className="border-red-300 text-red-700 w-full"
                disabled={saving}
                onClick={async () => {
                  await clearCourtesy();
                  setCourtesyModalOpen(false);
                }}
              >
                Quitar cortesía
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
