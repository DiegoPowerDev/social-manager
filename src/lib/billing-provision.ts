import { randomBytes } from "crypto";
import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { findAuthUserByEmail, createAuthUser } from "@/lib/firebase-auth-rest";
import { sendHostingerEmail } from "@/lib/hostinger-mail";

export type PayPalPlanKey = "basic_monthly" | "premium_monthly";

const PLAN_CONFIG: Record<
  PayPalPlanKey,
  {
    plan: "basic" | "premium";
    interval: "month";
    aiEnabled: boolean;
    aiCaptionsPerMonth: number;
    aiImagesPerMonth: number;
  }
> = {
  basic_monthly: {
    plan: "basic",
    interval: "month",
    aiEnabled: false,
    aiCaptionsPerMonth: 0,
    aiImagesPerMonth: 0,
  },
  premium_monthly: {
    plan: "premium",
    interval: "month",
    aiEnabled: true,
    aiCaptionsPerMonth: 100,
    aiImagesPerMonth: 30,
  },
};

function tempPassword() {
  return randomBytes(9).toString("base64url");
}

function membershipId(uid: string, companyId: string) {
  return `${uid}_${companyId}`;
}

function resolvePlanKey(raw: string): PayPalPlanKey {
  // compat por si aún llega un yearly viejo
  if (raw === "basic_yearly" || raw === "basic_monthly") return "basic_monthly";
  if (raw === "premium_yearly" || raw === "premium_monthly")
    return "premium_monthly";
  if (raw === "basic") return "basic_monthly";
  if (raw === "premium") return "premium_monthly";
  return PLAN_CONFIG[raw as PayPalPlanKey]
    ? (raw as PayPalPlanKey)
    : "premium_monthly";
}

async function sendWelcomeEmail(opts: {
  to: string;
  password: string | null;
  isNew: boolean;
  plan: string;
}) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;
  const subject = opts.isNew
    ? "Tu cuenta en TrendlyStudio está lista"
    : "Tu suscripción en TrendlyStudio se actualizó";

  const passwordBlock =
    opts.isNew && opts.password
      ? `<p><strong>Email:</strong> ${opts.to}<br/>
         <strong>Contraseña temporal:</strong> ${opts.password}</p>
         <p>Te recomendamos cambiarla después de entrar.</p>`
      : `<p>Usa el mismo email con el que pagaste para iniciar sesión. Tu plan ya está activo.</p>`;

  await sendHostingerEmail({
    to: opts.to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:520px">
        <h2>TrendlyStudio</h2>
        <p>Tu plan <strong>${opts.plan}</strong> está activo.</p>
        ${passwordBlock}
        <p><a href="${loginUrl}">Iniciar sesión</a></p>
      </div>
    `,
    text: `Plan ${opts.plan} activo. Entra en ${loginUrl}`,
  });
}

/** Empresa del usuario si no viene companyId en el checkout */
async function resolveCompanyIdForUser(
  uid: string,
  preferredCompanyId?: string,
): Promise<string | null> {
  if (preferredCompanyId) {
    const mem = await adminDb
      .collection("memberships")
      .doc(membershipId(uid, preferredCompanyId))
      .get();
    if (mem.exists) return preferredCompanyId;
  }

  const userSnap = await adminDb.collection("users").doc(uid).get();
  const active = userSnap.data()?.activeCompanyId as string | undefined;
  if (active) {
    const mem = await adminDb
      .collection("memberships")
      .doc(membershipId(uid, active))
      .get();
    if (mem.exists) return active;
  }

  const mems = await adminDb
    .collection("memberships")
    .where("uid", "==", uid)
    .limit(1)
    .get();
  if (!mems.empty) return mems.docs[0].data().companyId as string;

  return null;
}

export async function provisionFromPayPal(params: {
  email: string | null;
  subscriptionId: string;
  planKey: string;
  companyId?: string;
}) {
  const { email, subscriptionId } = params;

  if (!email) {
    throw new Error("No email in PayPal subscription");
  }

  const planKey = resolvePlanKey(params.planKey || "premium_monthly");
  const config = PLAN_CONFIG[planKey];

  let uid: string;
  let plainPassword: string | null = null;
  let isNewUser = false;

  const existing = await findAuthUserByEmail(email);
  if (existing) {
    uid = existing.localId;
  } else {
    plainPassword = tempPassword();
    const created = await createAuthUser({
      email,
      password: plainPassword,
      displayName: email.split("@")[0],
    });
    uid = created.localId;
    isNewUser = true;
  }

  await adminDb
    .collection("users")
    .doc(uid)
    .set(
      {
        email,
        name: email.split("@")[0],
        role: "admin",
        updatedAt: FieldValue.serverTimestamp(),
        ...(isNewUser ? { createdAt: FieldValue.serverTimestamp() } : {}),
      },
      { merge: true },
    );

  let companyId =
    (await resolveCompanyIdForUser(uid, params.companyId)) || null;

  const companyPayload = {
    plan: config.plan,
    planStatus: "active" as const,
    planSource: "billing" as const,
    features: { aiEnabled: config.aiEnabled },
    limits: {
      aiCaptionsPerMonth: config.aiCaptionsPerMonth,
      aiImagesPerMonth: config.aiImagesPerMonth,
    },
    paypalSubscriptionId: subscriptionId,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!companyId) {
    const companyRef = adminDb.collection("companies").doc();
    companyId = companyRef.id;

    await companyRef.set({
      name: "",
      logoUrl: null,
      aiInstructions: "",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: uid,
      ...companyPayload,
    });

    await adminDb
      .collection("memberships")
      .doc(membershipId(uid, companyId))
      .set({
        uid,
        companyId,
        role: "admin",
        email,
        createdAt: FieldValue.serverTimestamp(),
      });
  } else {
    await adminDb
      .collection("companies")
      .doc(companyId)
      .set(companyPayload, { merge: true });

    const memRef = adminDb
      .collection("memberships")
      .doc(membershipId(uid, companyId));
    if (!(await memRef.get()).exists) {
      await memRef.set({
        uid,
        companyId,
        role: "admin",
        email,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }

  await adminDb.collection("users").doc(uid).set(
    {
      activeCompanyId: companyId,
    },
    { merge: true },
  );

  await adminDb.collection("subscriptions").doc(subscriptionId).set(
    {
      companyId,
      uid,
      email,
      planKey,
      plan: config.plan,
      interval: config.interval,
      status: "active",
      provider: "paypal",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  try {
    await sendWelcomeEmail({
      to: email,
      password: plainPassword,
      isNew: isNewUser,
      plan: config.plan,
    });
  } catch (e) {
    console.error("Welcome email failed (user already provisioned):", e);
  }

  return { ok: true, companyId, uid, isNewUser, plan: config.plan };
}

async function setCompanyInactive(
  companyId: string,
  planStatus: "cancelled" | "past_due",
) {
  await adminDb
    .collection("companies")
    .doc(companyId)
    .set(
      {
        plan: "free",
        planStatus,
        planSource: "billing",
        limits: {
          aiCaptionsPerMonth: 0,
          aiImagesPerMonth: 0,
        },
        features: { aiEnabled: false },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function cancelPayPalSubscription(subscriptionId: string) {
  const ref = adminDb.collection("subscriptions").doc(subscriptionId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data()!;
  await ref.update({
    status: "cancelled",
    features: { aiEnabled: false },
    limits: {
      aiCaptionsPerMonth: 0,
      aiImagesPerMonth: 0,
    },
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (data.companyId) {
    await setCompanyInactive(data.companyId, "cancelled");
  }
}

/** Pago fallido / suspendido por PayPal → free + past_due (cron no publica) */
export async function suspendPayPalSubscription(subscriptionId: string) {
  const ref = adminDb.collection("subscriptions").doc(subscriptionId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data()!;
  await ref.update({
    status: "suspended",
    features: { aiEnabled: false },
    limits: {
      aiCaptionsPerMonth: 0,
      aiImagesPerMonth: 0,
    },
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (data.companyId) {
    await setCompanyInactive(data.companyId, "past_due");
  }
}
