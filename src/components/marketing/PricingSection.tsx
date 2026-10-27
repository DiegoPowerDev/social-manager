"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLAN_CARDS, type PlanId } from "@/content/plans";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

type Variant = "light" | "dark";

interface Props {
  variant?: Variant;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

function toPayPalPlanKey(planId: "basic" | "premium"): string {
  return planId === "basic" ? "basic_monthly" : "premium_monthly";
}

export function PricingSection({
  variant = "light",
  title = "Planes",
  subtitle = "Empieza gratis y escala cuando tu equipo publique más. Facturación mensual.",
}: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const companyId = useAuthStore((s) => s.companyId);
  const memberRole = useAuthStore((s) => s.memberRole);

  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const isDark = variant === "dark";

  const handleSelect = async (planId: PlanId, paid: boolean) => {
    if (!paid) {
      if (!user) {
        router.push("/login?next=/dashboard");
        return;
      }
      router.push("/dashboard");
      return;
    }

    if (planId !== "basic" && planId !== "premium") {
      toast.error("Plan no disponible para pago.");
      return;
    }

    if (user) {
      if (memberRole !== "admin") {
        toast.error("Solo un administrador puede cambiar el plan.");
        return;
      }
      if (!companyId) {
        toast.error("No hay empresa asociada a tu cuenta.");
        return;
      }
    }

    const planKey = toPayPalPlanKey(planId);
    setLoadingPlan(planId);

    try {
      const res = await fetch("/api/billing/paypal/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey,
          companyId: companyId || undefined,
          email: user?.email || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.approveUrl) {
        throw new Error(data.error || "No se pudo iniciar la suscripción");
      }
      window.location.href = data.approveUrl;
    } catch (e: any) {
      toast.error(e.message || "Error al conectar con PayPal");
      setLoadingPlan(null);
    }
  };

  const sectionClass = isDark
    ? "border-y border-white/10 bg-zinc-900/50 py-20 text-zinc-100"
    : "py-16 text-slate-900";

  return (
    <section
      id="pricing"
      className={sectionClass}
      style={{ contentVisibility: "auto", containIntrinsicSize: "800px" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className={`text-3xl font-bold tracking-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            {title}
          </h2>
          <p
            className={`mt-3 ${
              isDark ? "font-medium text-zinc-300" : "text-slate-600"
            }`}
          >
            {subtitle}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLAN_CARDS.map((plan) => (
            <div
              key={plan.id}
              className={
                isDark
                  ? `flex flex-col rounded-2xl border p-6 ${
                      plan.highlighted
                        ? "border-yellow-500/60 bg-yellow-500/10 shadow-lg shadow-yellow-500/10"
                        : "border-white/10 bg-zinc-950/80"
                    }`
                  : `flex flex-col rounded-2xl border bg-white p-6 shadow-lg shadow-black/5 ${
                      plan.highlighted
                        ? "border-amber-400 ring-2 ring-amber-400/40"
                        : "border-slate-200"
                    }`
              }
            >
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p
                className={`mt-1 text-sm ${
                  isDark ? "text-zinc-400" : "text-slate-500"
                }`}
              >
                {plan.description}
              </p>

              <p className="mt-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className={isDark ? "text-zinc-500" : "text-slate-500"}>
                  {plan.period}
                </span>
              </p>

              <ul
                className={`mt-6 flex-1 space-y-2 text-sm ${
                  isDark ? "text-zinc-300" : "text-slate-600"
                }`}
              >
                {plan.features.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span
                      className={isDark ? "text-yellow-500" : "text-amber-500"}
                    >
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={loadingPlan === plan.id}
                onClick={() => handleSelect(plan.id, plan.paid)}
                className={
                  isDark
                    ? `mt-8 block w-full rounded-xl py-2.5 text-center text-sm font-semibold disabled:opacity-60 ${
                        plan.highlighted
                          ? "bg-gradient-to-r from-orange-400 to-yellow-500 text-white"
                          : "border border-white/20 hover:bg-white/5"
                      }`
                    : `mt-8 block w-full rounded-full py-2.5 text-center text-sm font-semibold disabled:opacity-60 ${
                        plan.highlighted
                          ? "bg-gradient-to-r from-orange-400 to-yellow-500 text-white"
                          : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                      }`
                }
              >
                {loadingPlan === plan.id ? "Redirigiendo…" : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {!user && (
          <p
            className={`mt-8 text-center text-sm ${
              isDark ? "text-zinc-300" : "text-slate-600"
            }`}
          >
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="underline hover:no-underline">
              Inicia sesión
            </Link>{" "}
            para vincular el plan a tu empresa.
          </p>
        )}
      </div>
    </section>
  );
}
