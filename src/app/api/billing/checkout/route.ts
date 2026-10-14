import { NextRequest, NextResponse } from "next/server";
import { variantIdFor, type PlanKey, type Interval } from "@/lib/lemon";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const plan = body.plan as PlanKey; // "basic" | "premium"
    const interval = (body.interval || "month") as Interval;
    const companyId = body.companyId as string;
    const email = body.email as string | undefined;
    const uid = body.uid as string | undefined;

    if (!companyId || !plan) {
      return NextResponse.json(
        { error: "Faltan companyId o plan" },
        { status: 400 },
      );
    }

    const variantId = variantIdFor(plan, interval);
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!variantId || !apiKey || !storeId) {
      return NextResponse.json(
        { error: "Billing no configurado (env Lemon)" },
        { status: 500 },
      );
    }

    // API Lemon Squeezy: crear checkout
    // Docs: https://docs.lemonsqueezy.com/api/checkouts
    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: email || undefined,
              custom: {
                company_id: companyId,
                user_id: uid || "",
              },
            },
            product_options: {
              redirect_url: `${baseUrl}/dashboard?billing=success`,
            },
          },
          relationships: {
            store: {
              data: { type: "stores", id: String(storeId) },
            },
            variant: {
              data: { type: "variants", id: String(variantId) },
            },
          },
        },
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("Lemon checkout error:", json);
      return NextResponse.json(
        { error: json?.errors?.[0]?.detail || "Error al crear checkout" },
        { status: 500 },
      );
    }

    const checkoutUrl = json?.data?.attributes?.url as string | undefined;
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "No se recibió URL de checkout" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (e: any) {
    console.error("Checkout error:", e);
    return NextResponse.json(
      { error: e.message || "Error de checkout" },
      { status: 500 },
    );
  }
}
