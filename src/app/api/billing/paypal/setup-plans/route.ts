import { NextRequest, NextResponse } from "next/server";
import { getPayPalAccessToken, paypalBase } from "@/lib/paypal";

export const maxDuration = 60;

type Cycle = {
  interval_unit: "MONTH" | "YEAR";
  value: string; // "19.00"
  name: string;
  envKey: string;
};

const PLANS: Cycle[] = [
  {
    name: "TrendlyStudio Básico Mensual",
    interval_unit: "MONTH",
    value: "19.00",
    envKey: "PAYPAL_PLAN_BASIC_MONTHLY",
  },
  {
    name: "TrendlyStudio Básico Anual",
    interval_unit: "YEAR",
    value: "190.00",
    envKey: "PAYPAL_PLAN_BASIC_YEARLY",
  },
  {
    name: "TrendlyStudio Premium Mensual",
    interval_unit: "MONTH",
    value: "39.00",
    envKey: "PAYPAL_PLAN_PREMIUM_MONTHLY",
  },
  {
    name: "TrendlyStudio Premium Anual",
    interval_unit: "YEAR",
    value: "390.00",
    envKey: "PAYPAL_PLAN_PREMIUM_YEARLY",
  },
];

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (!secret || secret !== process.env.BILLING_SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await getPayPalAccessToken();
    const base = paypalBase();

    // 1) Product
    const productRes = await fetch(`${base}/v1/catalogs/products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name: "TrendlyStudio",
        description:
          "Plataforma SaaS multi-redes: publicación, calendario e IA",
        type: "SERVICE",
        category: "SOFTWARE",
      }),
    });
    const product = await productRes.json();
    if (!productRes.ok) {
      return NextResponse.json(
        { error: "Product failed", detail: product },
        { status: 500 },
      );
    }

    const productId = product.id as string;
    const planIds: Record<string, string> = {};

    // 2) Plans
    for (const p of PLANS) {
      const planRes = await fetch(`${base}/v1/billing/plans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          product_id: productId,
          name: p.name,
          description: p.name,
          status: "ACTIVE",
          billing_cycles: [
            {
              frequency: {
                interval_unit: p.interval_unit,
                interval_count: 1,
              },
              tenure_type: "REGULAR",
              sequence: 1,
              total_cycles: 0,
              pricing_scheme: {
                fixed_price: {
                  value: p.value,
                  currency_code: "USD",
                },
              },
            },
          ],
          payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee_failure_action: "CONTINUE",
            payment_failure_threshold: 3,
          },
        }),
      });
      const plan = await planRes.json();
      if (!planRes.ok) {
        return NextResponse.json(
          { error: "Plan failed", plan: p.name, detail: plan },
          { status: 500 },
        );
      }
      planIds[p.envKey] = plan.id;
    }

    return NextResponse.json({
      ok: true,
      mode: process.env.PAYPAL_MODE || "sandbox",
      productId,
      planIds,
      hint: "Copia planIds a las variables de entorno en Vercel",
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message || "setup failed" },
      { status: 500 },
    );
  }
}
