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
  title = "Planes",
  subtitle = "Empieza gratis y escala cuando tu equipo publique más. Facturación mensual.",
}: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const companyId = useAuthStore((s) => s.companyId);
  const memberRole = useAuthStore((s) => s.memberRole);

  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

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

  return (
    <section
      id="pricing"
      className="border-y border-white/10  py-20 text-zinc-100"
      style={{ contentVisibility: "auto", containIntrinsicSize: "800px" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl p-4 rounded-xl text-center bg-zinc-950/70">
          <h2
            className={`text-3xl font-bold tracking-tight text-yellow-400
            }`}
          >
            {title}
          </h2>
          <p
            className={`mt-3 
             font-medium text-white`}
          >
            {subtitle}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLAN_CARDS.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col duration-300  hover:ring-yellow-600 hover:ring-4  hover:shadow-yellow-500/60 bg-zinc-950/80 rounded-2xl border-4 p-6 ${
                plan.highlighted
                  ? "border-yellow-500 shadow-xl ring-yellow-600 ring-2  shadow-yellow-500/60"
                  : "border-white/10 "
              }`}
            >
              <h3 className="text-lg text-yellow-400 font-semibold">
                {plan.name}
              </h3>
              <p
                className={`mt-1 text-sm text-white
                `}
              >
                {plan.description}
              </p>

              <p className="mt-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-zinc-500">{plan.period}</span>
              </p>

              <ul className={`mt-6 flex-1 space-y-2 text-sm text-zinc-300`}>
                {plan.features.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-yellow-500">✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={loadingPlan === plan.id}
                onClick={() => handleSelect(plan.id, plan.paid)}
                className={`mt-8 block w-full cursor-pointer rounded-xl py-2.5 text-center text-sm font-bold disabled:opacity-60 ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-orange-400 to-yellow-500 text-white"
                    : "border-2 border-yellow-400/40 bg-yellow-600 hover:bg-yellow-600/80"
                }`}
              >
                {loadingPlan === plan.id ? "Redirigiendo…" : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {!user && (
          <p className={`mt-8 text-center text-sm text-zinc-300`}>
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
