import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { planFromVariantId } from "@/lib/lemon";
import { sendWelcomeSetPasswordEmail } from "@/lib/email";

export const runtime = "nodejs";

/** Límites por plan (ajusta a tu tenant-admin / PLAN_LIMITS) */
const PLAN_LIMITS: Record<
  string,
  { aiEnabled: boolean; aiCaptionsPerMonth: number; aiImagesPerMonth: number }
> = {
  free: { aiEnabled: true, aiCaptionsPerMonth: 15, aiImagesPerMonth: 3 },
  basic: { aiEnabled: false, aiCaptionsPerMonth: 0, aiImagesPerMonth: 0 },
  premium: { aiEnabled: true, aiCaptionsPerMonth: 100, aiImagesPerMonth: 30 },
  yearly: { aiEnabled: true, aiCaptionsPerMonth: 150, aiImagesPerMonth: 50 },
};

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, "utf8"),
      Buffer.from(signature, "utf8"),
    );
  } catch {
    return false;
  }
}

function pickEmail(payload: any, attrs: any): string | null {
  const candidates = [
    attrs?.user_email,
    attrs?.customer_email,
    payload?.data?.attributes?.user_email,
    payload?.meta?.custom_data?.email,
  ];
  for (const e of candidates) {
    if (typeof e === "string" && e.includes("@")) return e.trim().toLowerCase();
  }
  return null;
}

async function upsertCompanyPlan(params: {
  companyId: string;
  plan: string;
  interval: string;
  status: "active" | "cancelled" | "expired";
  subscriptionId: string | null;
  customerId: string | null;
  variantId: string | null;
}) {
  const {
    companyId,
    plan,
    interval,
    status,
    subscriptionId,
    customerId,
    variantId,
  } = params;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.basic;
  const aiEnabled =
    status === "active" ? limits.aiEnabled || plan === "premium" : false;

  await adminDb
    .collection("companies")
    .doc(companyId)
    .set(
      {
        plan: status === "active" ? plan : "free",
        planInterval: interval,
        planStatus: status,
        features: { aiEnabled },
        limits:
          status === "active"
            ? {
                aiCaptionsPerMonth: limits.aiCaptionsPerMonth,
                aiImagesPerMonth: limits.aiImagesPerMonth,
              }
            : PLAN_LIMITS.free,
        lemonSubscriptionId: subscriptionId,
        lemonCustomerId: customerId,
        lemonVariantId: variantId,
        planUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

async function provisionGuest(params: {
  email: string;
  plan: string;
  interval: string;
  subscriptionId: string | null;
  customerId: string | null;
  variantId: string | null;
}) {
  const { email, plan, interval, subscriptionId, customerId, variantId } =
    params;
  const auth = getAuth();

  // 1) Auth user
  let uid: string;
  let isNewUser = false;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
  } catch {
    const created = await auth.createUser({
      email,
      emailVerified: true,
      password: crypto.randomBytes(24).toString("base64url") + "Aa1!",
    });
    uid = created.uid;
    isNewUser = true;
  }

  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  let companyId = userSnap.data()?.activeCompanyId as string | undefined;

  // 2) Empresa + membership si no tiene
  if (!companyId) {
    const companyRef = adminDb.collection("companies").doc();
    companyId = companyRef.id;
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.basic;

    await companyRef.set({
      name: "",
      logoUrl: null,
      aiInstructions: "",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: uid,
      plan,
      planInterval: interval,
      planStatus: "active",
      features: { aiEnabled: limits.aiEnabled || plan === "premium" },
      limits: {
        aiCaptionsPerMonth: limits.aiCaptionsPerMonth,
        aiImagesPerMonth: limits.aiImagesPerMonth,
      },
      lemonSubscriptionId: subscriptionId,
      lemonCustomerId: customerId,
      lemonVariantId: variantId,
      planUpdatedAt: FieldValue.serverTimestamp(),
    });

    await adminDb.collection("memberships").doc(`${uid}_${companyId}`).set({
      uid,
      companyId,
      role: "admin",
      email,
      createdAt: FieldValue.serverTimestamp(),
    });

    await userRef.set(
      {
        email,
        name: email.split("@")[0],
        activeCompanyId: companyId,
        role: "admin",
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } else {
    await upsertCompanyPlan({
      companyId,
      plan,
      interval,
      status: "active",
      subscriptionId,
      customerId,
      variantId,
    });
  }

  // 3) Email solo si es usuario nuevo
  if (isNewUser) {
    try {
      const resetLink = await auth.generatePasswordResetLink(email, {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/login?billing=success`,
      });
      await sendWelcomeSetPasswordEmail(email, resetLink);
    } catch (e) {
      console.error("Welcome email failed:", e);
    }
  }

  return { uid, companyId };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload?.meta?.event_name || payload?.meta?.eventName || "";
  const attrs = payload?.data?.attributes || {};
  const custom = payload?.meta?.custom_data || {};

  const companyIdFromCustom = custom.company_id || custom.companyId || "";
  const guestFlag =
    custom.guest === "1" || custom.guest === true || !companyIdFromCustom;

  const variantId =
    attrs.variant_id != null
      ? String(attrs.variant_id)
      : attrs.first_order_item?.variant_id != null
        ? String(attrs.first_order_item.variant_id)
        : null;

  const mapped = variantId ? planFromVariantId(variantId) : null;
  const plan =
    mapped?.plan ||
    (custom.plan === "premium" || custom.plan === "basic"
      ? custom.plan
      : "basic");
  const interval =
    mapped?.interval || (custom.interval === "year" ? "year" : "month");

  const subscriptionId =
    payload?.data?.id != null ? String(payload.data.id) : null;
  const customerId =
    attrs.customer_id != null ? String(attrs.customer_id) : null;

  const email = pickEmail(payload, attrs);

  try {
    // ——— Alta / update de suscripción ———
    if (
      eventName === "subscription_created" ||
      eventName === "subscription_updated" ||
      eventName === "subscription_payment_success"
    ) {
      const statusAttr = (attrs.status || "active") as string;
      const active =
        statusAttr === "active" ||
        statusAttr === "on_trial" ||
        statusAttr === "paid";

      if (guestFlag && email) {
        await provisionGuest({
          email,
          plan,
          interval,
          subscriptionId,
          customerId,
          variantId,
        });
      } else if (companyIdFromCustom) {
        await upsertCompanyPlan({
          companyId: String(companyIdFromCustom),
          plan,
          interval,
          status: active ? "active" : "cancelled",
          subscriptionId,
          customerId,
          variantId,
        });
      } else {
        console.warn("Webhook sin company_id ni email", eventName);
      }
    }

    // ——— Cancelación / expiración ———
    if (
      eventName === "subscription_cancelled" ||
      eventName === "subscription_expired"
    ) {
      const companyId =
        companyIdFromCustom ||
        // buscar por lemonSubscriptionId si hace falta
        null;

      if (companyId) {
        await upsertCompanyPlan({
          companyId: String(companyId),
          plan: "free",
          interval: "month",
          status:
            eventName === "subscription_expired" ? "expired" : "cancelled",
          subscriptionId,
          customerId,
          variantId,
        });
      } else if (subscriptionId) {
        const snap = await adminDb
          .collection("companies")
          .where("lemonSubscriptionId", "==", subscriptionId)
          .limit(1)
          .get();
        if (!snap.empty) {
          await upsertCompanyPlan({
            companyId: snap.docs[0].id,
            plan: "free",
            interval: "month",
            status:
              eventName === "subscription_expired" ? "expired" : "cancelled",
            subscriptionId,
            customerId,
            variantId,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Lemon webhook error:", e);
    return NextResponse.json(
      { error: e.message || "Webhook failed" },
      { status: 500 },
    );
  }
}
