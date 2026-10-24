"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import TitleComponent from "@/components/layout/titleComponent";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LucideLoaderCircle, CreditCard, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type PlanStatus = "active" | "cancelled" | "past_due" | "free" | string;

interface CompanyMembership {
  name?: string;
  plan?: string;
  planStatus?: PlanStatus;
  paypalSubscriptionId?: string | null;
  limits?: {
    aiCaptionsPerMonth?: number;
    aiImagesPerMonth?: number;
  };
  features?: {
    aiEnabled?: boolean;
  };
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

  const currentPlan = company?.plan || plan || "free";
  const planLabel = PLAN_LABEL[currentPlan] || currentPlan;
  const planStatus = company?.planStatus || "free";

  const nextBilling = subInfo?.nextBillingTime
    ? (() => {
        try {
          return format(new Date(subInfo.nextBillingTime!), "d MMMM yyyy", {
            locale: es,
          });
        } catch {
          return subInfo.nextBillingTime;
        }
      })()
    : null;

  const handleRenewOrChange = () => {
    router.push("/plans");
  };

  if (!companyId) {
    return (
      <div className="p-6">
        <TitleComponent title="Membresía" description="Sin empresa asociada" />
        <p className="text-sm text-muted-foreground mt-4">
          No hay una empresa vinculada a tu sesión.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-zinc-950/50 backdrop-blur p-6">
        <div className="  text-white">
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
      <div className="p-6">
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

            <Card className="bg-white/70 border-white/50 p-6">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-xl">Plan actual</CardTitle>
                  {statusBadge(subInfo?.status || planStatus)}
                </div>
                <CardDescription>
                  {user?.email
                    ? `Cuenta: ${user.email}`
                    : "Información de suscripción de la empresa"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/80 p-4 border border-white/60">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Tipo de plan
                    </p>
                    <p className="mt-1 text-2xl font-bold capitalize">
                      {planLabel}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-4 border border-white/60">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Próximo cobro / renovación
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {currentPlan === "free"
                        ? "—"
                        : nextBilling || "Consulta en PayPal"}
                    </p>
                    {currentPlan !== "free" && !nextBilling && (
                      <p className="text-xs text-muted-foreground mt-1">
                        La fecha aparece cuando PayPal reporta el próximo ciclo.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-white/60 p-4 border border-white/50 text-sm space-y-2">
                  <p>
                    <span className="text-muted-foreground">IA: </span>
                    {company?.features?.aiEnabled ? "Incluida" : "No incluida"}
                  </p>
                  {company?.features?.aiEnabled && (
                    <p>
                      <span className="text-muted-foreground">
                        Límites IA:{" "}
                      </span>
                      {company?.limits?.aiCaptionsPerMonth ?? "—"} captions /{" "}
                      {company?.limits?.aiImagesPerMonth ?? "—"} imágenes al mes
                    </p>
                  )}
                  {company?.paypalSubscriptionId && (
                    <p className="text-xs text-muted-foreground break-all">
                      ID suscripción PayPal: {company.paypalSubscriptionId}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {isAdmin ? (
                    <>
                      <Button
                        onClick={handleRenewOrChange}
                        className="bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white shadow-lg shadow-orange-500/25"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {currentPlan === "free"
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

            <p className="text-xs text-muted-foreground">
              Al contratar o cambiar de plan serás redirigido a PayPal. La
              activación se confirma por webhook y puede tardar unos segundos.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
