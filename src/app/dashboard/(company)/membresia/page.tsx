"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LucideLoaderCircle,
  CreditCard,
  RefreshCw,
  Gift,
  Handshake,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type PlanStatus = "active" | "cancelled" | "past_due" | "free" | string;

interface CompanyMembership {
  name?: string;
  plan?: string;
  planStatus?: PlanStatus;
  planSource?: string | null;
  paypalSubscriptionId?: string | null;
  limits?: {
    aiCaptionsPerMonth?: number;
    aiImagesPerMonth?: number;
  };
  features?: {
    aiEnabled?: boolean;
  };
  partner?: {
    active?: boolean;
    tier?: string | null;
    reason?: string | null;
    until?: string | null;
    limits?: {
      aiCaptionsPerMonth?: number;
      aiImagesPerMonth?: number;
    };
  } | null;
  courtesy?: {
    active?: boolean;
    plan?: string | null;
    reason?: string | null;
    until?: string | null;
    limits?: {
      aiCaptionsPerMonth?: number;
      aiImagesPerMonth?: number;
    };
  } | null;
}

interface SubInfo {
  status?: string;
  nextBillingTime?: string | null;
  planKey?: string | null;
}

const PLAN_LABEL: Record<string, string> = {
  free: "Gratis",
  basic: "Básico",
  premium: "Premium",
};

function statusBadge(status?: string) {
  const s = (status || "unknown").toLowerCase();
  if (s === "active" || s === "approved") {
    return (
      <Badge className="bg-emerald-500/20 text-emerald-800 border-emerald-500/30">
        Activo
      </Badge>
    );
  }
  if (s === "cancelled" || s === "canceled") {
    return (
      <Badge variant="destructive" className="opacity-90">
        Cancelado
      </Badge>
    );
  }
  if (s === "past_due" || s === "suspended") {
    return (
      <Badge className="bg-amber-500/20 text-amber-900 border-amber-500/40">
        Pago pendiente
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="capitalize">
      {status || "—"}
    </Badge>
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  try {
    return format(new Date(iso), "d MMMM yyyy", { locale: es });
  } catch {
    return iso;
  }
}

function isActiveUntil(until?: string | null) {
  if (!until) return true; // sin fecha = indefinido
  return new Date(until).getTime() > Date.now();
}

export default function MembresiaPage() {
  const router = useRouter();
  const { companyId, companyName, memberRole, plan, user } = useAuthStore();

  const [company, setCompany] = useState<CompanyMembership | null>(null);
  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = memberRole === "admin";

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const snap = await getDoc(doc(db, "companies", companyId));
      if (!snap.exists()) {
        setCompany(null);
        setLoading(false);
        return;
      }
      const data = snap.data() as CompanyMembership;
      setCompany(data);

      const subId = data.paypalSubscriptionId;
      if (subId) {
        const res = await fetch(
          `/api/billing/paypal/subscription?id=${encodeURIComponent(subId)}`,
        );
        if (res.ok) {
          const json = await res.json();
          setSubInfo({
            status: json.status,
            nextBillingTime: json.nextBillingTime ?? null,
            planKey: json.planKey ?? null,
          });
        } else {
          setSubInfo(null);
        }
      } else {
        setSubInfo(null);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "No se pudo cargar la membresía");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const billingPlan = company?.plan || "free";
  const partnerActive =
    !!company?.partner?.active && isActiveUntil(company.partner?.until);
  const courtesyActive =
    !!company?.courtesy?.active && isActiveUntil(company.courtesy?.until);

  // Plan efectivo: cortesía > socio > facturación (o el del store)
  const effectivePlan =
    (courtesyActive && company?.courtesy?.plan) ||
    (partnerActive && company?.partner?.tier) ||
    plan ||
    billingPlan ||
    "free";

  const planLabel = PLAN_LABEL[effectivePlan] || effectivePlan;
  const billingLabel = PLAN_LABEL[billingPlan] || billingPlan;
  const planStatus = company?.planStatus || "free";

  const nextBilling = subInfo?.nextBillingTime
    ? formatDate(subInfo.nextBillingTime)
    : null;

  const handleRenewOrChange = () => {
    router.push("/plans");
  };

  if (!companyId) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground mt-4">
          No hay una empresa vinculada a tu sesión.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-zinc-950/50 backdrop-blur p-6">
        <div className="text-white">
          <h1 className="text-2xl font-bold">Membresía</h1>
          <p className="text-sm">
            Publicando como{" "}
            <span className="font-bold text-white">
              {companyName
                ? `Plan de ${companyName}`
                : "Estado del plan de tu empresa"}
            </span>
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={loading || refreshing}
          onClick={() => {
            setRefreshing(true);
            load();
          }}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <LucideLoaderCircle className="h-12 w-12 animate-spin text-yellow-200" />
          </div>
        ) : (
          <>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </p>
            )}

            <Card className="bg-zinc-950/50 p-6">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-xl text-white">
                    Plan actual
                  </CardTitle>
                  {statusBadge(subInfo?.status || planStatus)}
                </div>
                <CardDescription className="text-white/50">
                  {user?.email
                    ? `Cuenta: ${user.email}`
                    : "Información de suscripción de la empresa"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/80 p-4 border border-white/60">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Acceso efectivo
                    </p>
                    <p className="mt-1 text-2xl font-bold capitalize">
                      {planLabel}
                    </p>
                    {(partnerActive || courtesyActive) &&
                      billingPlan !== effectivePlan && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Facturación: {billingLabel}
                        </p>
                      )}
                  </div>
                  <div className="rounded-xl bg-white/80 p-4 border border-white/60">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Próximo cobro / renovación
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {billingPlan === "free" && !company?.paypalSubscriptionId
                        ? "—"
                        : nextBilling || "Consulta en PayPal"}
                    </p>
                    {billingPlan !== "free" && !nextBilling && (
                      <p className="text-xs text-muted-foreground mt-1">
                        La fecha aparece cuando PayPal reporta el próximo ciclo.
                      </p>
                    )}
                  </div>
                </div>

                {/* Socio */}
                {partnerActive && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/90 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Handshake className="h-4 w-4 text-violet-700" />
                      <p className="text-sm font-semibold text-violet-900">
                        Programa socio
                      </p>
                      <Badge className="bg-violet-500/20 text-violet-900 capitalize">
                        {company?.partner?.tier || "—"}
                      </Badge>
                    </div>
                    <p className="text-sm text-violet-900/80">
                      Tienes acceso de tipo{" "}
                      <strong className="capitalize">
                        {PLAN_LABEL[company?.partner?.tier || ""] ||
                          company?.partner?.tier}
                      </strong>{" "}
                      por acuerdo de socio
                      {company?.partner?.until
                        ? ` hasta ${formatDate(company.partner.until)}`
                        : " (sin fecha de fin)"}
                      .
                    </p>
                    {company?.partner?.reason && (
                      <p className="text-xs text-violet-800/70">
                        Motivo: {company.partner.reason}
                      </p>
                    )}
                  </div>
                )}

                {/* Cortesía */}
                {courtesyActive && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-amber-800" />
                      <p className="text-sm font-semibold text-amber-900">
                        Cortesía activa
                      </p>
                      <Badge className="bg-emerald-500/20 text-emerald-800 capitalize">
                        {company?.courtesy?.plan || "premium"}
                      </Badge>
                    </div>
                    <p className="text-sm text-amber-900/80">
                      Compensación temporal con acceso{" "}
                      <strong className="capitalize">
                        {PLAN_LABEL[company?.courtesy?.plan || "premium"] ||
                          company?.courtesy?.plan}
                      </strong>
                      {company?.courtesy?.until
                        ? ` hasta el ${formatDate(company.courtesy.until)}`
                        : ""}
                      .
                    </p>
                    {company?.courtesy?.reason && (
                      <p className="text-xs text-amber-900/70">
                        Motivo: {company.courtesy.reason}
                      </p>
                    )}
                  </div>
                )}

                {company?.paypalSubscriptionId && (
                  <p className="text-xs text-muted-foreground break-all">
                    ID suscripción PayPal: {company.paypalSubscriptionId}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  {isAdmin ? (
                    <>
                      <Button
                        onClick={handleRenewOrChange}
                        className="bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white shadow-lg shadow-orange-500/25"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {billingPlan === "free" &&
                        !company?.paypalSubscriptionId
                          ? "Contratar un plan"
                          : "Renovar o cambiar plan"}
                      </Button>
                      {company?.paypalSubscriptionId && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            window.open(
                              "https://www.paypal.com/myaccount/autopay/",
                              "_blank",
                            )
                          }
                        >
                          Gestionar en PayPal
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3">
                      Solo un administrador puede renovar o cambiar el plan.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
