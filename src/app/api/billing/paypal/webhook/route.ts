import { NextRequest, NextResponse } from "next/server";
import { getPayPalAccessToken, paypalBase } from "@/lib/paypal";
import {
  provisionFromPayPal,
  cancelPayPalSubscription,
} from "@/lib/billing-provision";

export const maxDuration = 60;

async function verifyWebhook(headers: Headers, body: string) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn("PAYPAL_WEBHOOK_ID missing — skip verify (solo dev)");
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
    if (!(await verifyWebhook(req.headers, raw))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(raw);
    const type = event.event_type as string;
    const resource = event.resource || {};

    console.log("PayPal webhook:", type, resource.id);

    if (type === "BILLING.SUBSCRIPTION.ACTIVATED") {
      let meta: {
        companyId?: string;
        planKey?: string;
        email?: string | null;
      } = {};
      try {
        if (resource.custom_id) meta = JSON.parse(resource.custom_id);
      } catch {
        /* ignore */
      }

      const email = resource.subscriber?.email_address || meta.email || null;

      const result = await provisionFromPayPal({
        email,
        subscriptionId: resource.id,
        planKey: meta.planKey || "premium_monthly",
        companyId: meta.companyId,
      });

      console.log("provision result", result);
    }

    if (
      type === "BILLING.SUBSCRIPTION.CANCELLED" ||
      type === "BILLING.SUBSCRIPTION.EXPIRED"
    ) {
      await cancelPayPalSubscription(resource.id);
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("PayPal webhook error:", e);
    return NextResponse.json(
      { error: e.message || "webhook failed" },
      { status: 500 },
    );
  }
}
