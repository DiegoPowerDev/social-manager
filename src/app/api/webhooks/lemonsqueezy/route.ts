import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { planFromVariantId, verifyLemonWebhook } from "@/lib/lemon";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  if (!verifyLemonWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload?.meta?.event_name as string | undefined;
  const custom = payload?.meta?.custom_data as
    | { company_id?: string; user_id?: string }
    | undefined;

  // Según el tipo de evento, los datos vienen en data.attributes
  const attrs = payload?.data?.attributes || {};
  const relationships = payload?.data?.relationships || {};

  // companyId: custom data del checkout (prioridad)
  let companyId = custom?.company_id || attrs?.custom_data?.company_id;

  // variant id (suscripción)
  const variantId =
    attrs?.variant_id ||
    relationships?.variant?.data?.id ||
    attrs?.first_order_item?.variant_id;

  const subscriptionId = payload?.data?.id
    ? String(payload.data.id)
    : attrs?.subscription_id
      ? String(attrs.subscription_id)
      : null;

  const customerId = attrs?.customer_id ? String(attrs.customer_id) : null;
  const status = attrs?.status as string | undefined; // active, cancelled, expired...

  console.log("[Lemon webhook]", eventName, { companyId, variantId, status });

  if (!companyId) {
    // Sin company no sabemos a quién activar
    console.warn("Webhook sin company_id en custom_data");
    return NextResponse.json({ ok: true, skipped: true });
  }

  const companyRef = adminDb.collection("companies").doc(String(companyId));

  try {
    if (
      eventName === "subscription_created" ||
      eventName === "subscription_updated" ||
      eventName === "subscription_payment_success"
    ) {
      const mapped = variantId ? planFromVariantId(variantId) : null;
      const planStatus =
        status === "active" || status === "on_trial"
          ? "active"
          : status === "cancelled"
            ? "cancelled"
            : status === "expired" || status === "unpaid"
              ? "expired"
              : "active";

      await companyRef.set(
        {
          ...(mapped
            ? {
                plan: mapped.plan,
                planInterval: mapped.interval,
              }
            : {}),
          planStatus,
          lemonSubscriptionId: subscriptionId,
          lemonCustomerId: customerId,
          lemonVariantId: variantId ? String(variantId) : null,
          planUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (
      eventName === "subscription_cancelled" ||
      eventName === "subscription_expired"
    ) {
      await companyRef.set(
        {
          planStatus:
            eventName === "subscription_expired" ? "expired" : "cancelled",
          // Opcional: al expirar volver a free
          // plan: "free",
          planUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Lemon webhook handler error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
