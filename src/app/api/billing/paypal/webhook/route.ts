import { NextRequest, NextResponse } from "next/server";
import { getPayPalAccessToken, paypalBase } from "@/lib/paypal";
// import { adminDb } from "@/lib/firebase-admin";
// import { provisionFromPayPal } from "@/lib/billing-provision";

export const maxDuration = 60;

async function verifyWebhook(headers: Headers, body: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    // En sandbox puedes loguear sin verificar un rato; en live pon WEBHOOK_ID
    console.warn("PAYPAL_WEBHOOK_ID no configurado — skip verify");
    return true;
  }

  const token = await getPayPalAccessToken();
  const res = await fetch(
    `${paypalBase()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    },
  );
  const data = await res.json();
  return data.verification_status === "SUCCESS";
}

export async function POST(req: NextRequest) {
  const raw = await req.text();

  try {
    const ok = await verifyWebhook(req.headers, raw);
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(raw);
    const type = event.event_type as string;
    const resource = event.resource || {};

    console.log("PayPal webhook:", type, resource.id);

    if (type === "BILLING.SUBSCRIPTION.ACTIVATED") {
      let meta: { companyId?: string; planKey?: string; email?: string } = {};
      try {
        meta = resource.custom_id ? JSON.parse(resource.custom_id) : {};
      } catch {
        /* custom_id simple */
      }

      const email = resource.subscriber?.email_address || meta.email || null;
      const subscriptionId = resource.id as string;
      const planKey = meta.planKey || "premium_monthly";

      // TODO: provisionFromPayPal({ email, subscriptionId, planKey, companyId: meta.companyId })
      console.log("ACTIVATED → provision", {
        email,
        subscriptionId,
        planKey,
        companyId: meta.companyId,
      });
    }

    if (type === "BILLING.SUBSCRIPTION.CANCELLED") {
      const subscriptionId = resource.id as string;
      console.log("CANCELLED", subscriptionId);
      // TODO: bajar plan a free en Firestore por subscriptionId
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("webhook error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
