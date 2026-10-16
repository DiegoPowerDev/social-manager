import { NextRequest, NextResponse } from "next/server";
import {
  getPayPalAccessToken,
  getPlanId,
  paypalBase,
  type PlanKey,
} from "@/lib/paypal";

const VALID: PlanKey[] = [
  "basic_monthly",
  "basic_yearly",
  "premium_monthly",
  "premium_yearly",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const planKey = body.planKey as PlanKey;
    const companyId = (body.companyId as string) || "new";
    const email = (body.email as string) || undefined;

    if (!VALID.includes(planKey)) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }

    const planId = getPlanId(planKey);
    if (!planId) {
      return NextResponse.json(
        { error: `Falta env para ${planKey}` },
        { status: 500 },
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL no configurada" },
        { status: 500 },
      );
    }

    const token = await getPayPalAccessToken();
    const res = await fetch(`${paypalBase()}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: JSON.stringify({ companyId, planKey, email: email || null }),
        application_context: {
          brand_name: "TrendlyStudio",
          locale: "es-ES",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          return_url: `${appUrl}/gracias?paypal=success`,
          cancel_url: `${appUrl}/plans?paypal=cancel`,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("create subscription", data);
      return NextResponse.json(
        { error: data.message || "No se pudo crear la suscripción" },
        { status: 500 },
      );
    }

    const approve = (data.links || []).find(
      (l: { rel: string }) => l.rel === "approve",
    );

    if (!approve?.href) {
      return NextResponse.json(
        { error: "PayPal no devolvió URL de aprobación" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      subscriptionId: data.id,
      approveUrl: approve.href,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Error" }, { status: 500 });
  }
}
