import { randomBytes } from "crypto";
import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { findAuthUserByEmail, createAuthUser } from "@/lib/firebase-auth-rest";
import { sendHostingerEmail } from "@/lib/hostinger-mail";

export type PayPalPlanKey =
  | "basic_monthly"
  | "basic_yearly"
  | "premium_monthly"
  | "premium_yearly";

const PLAN_CONFIG: Record<
  PayPalPlanKey,
  {
    plan: "basic" | "premium";
    interval: "month" | "year";
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
  basic_yearly: {
    plan: "basic",
    interval: "year",
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
  premium_yearly: {
    plan: "premium",
    interval: "year",
    aiEnabled: true,
    aiCaptionsPerMonth: 150,
    aiImagesPerMonth: 50,
  },
};

function tempPassword() {
  return randomBytes(9).toString("base64url");
}

function membershipId(uid: string, companyId: string) {
  return `${uid}_${companyId}`;
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
    : "Tu suscripción en TrendlyStudio se activó";

  const passwordBlock =
    opts.isNew && opts.password
      ? `<p><strong>Email:</strong> ${opts.to}<br/>
         <strong>Contraseña temporal:</strong> ${opts.password}</p>
         <p>Te recomendamos cambiarla después de entrar.</p>`
      : `<p>Usa el mismo email con el que pagaste para iniciar sesión.</p>`;

  await sendHostingerEmail({
    to: opts.to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:520px">
        <h2>Bienvenido a TrendlyStudio</h2>
        <p>Tu plan <strong>${opts.plan}</strong> ya está activo.</p>
        ${passwordBlock}
        <p><a href="${loginUrl}">Iniciar sesión</a></p>
      </div>
    `,
    text: `Plan ${opts.plan} activo. Entra en ${loginUrl}`,
  });
}

export async function provisionFromPayPal(params: {
  email: string | null;
  subscriptionId: string;
  planKey: string;
  companyId?: string;
}) {
  const { email, subscriptionId, companyId: existingCompanyId } = params;

  if (!email) {
    throw new Error("No email in PayPal subscription");
  }

  const planKey = (params.planKey || "premium_monthly") as PayPalPlanKey;
  const config = PLAN_CONFIG[planKey] || PLAN_CONFIG.premium_monthly;

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

  // users/{uid}
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

  let companyId = existingCompanyId;

  if (!companyId) {
    const companyRef = adminDb.collection("companies").doc();
    companyId = companyRef.id;

    await companyRef.set({
      name: "",
      logoUrl: null,
      aiInstructions: "",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: uid,
      plan: config.plan,
      planStatus: "active",
      features: { aiEnabled: config.aiEnabled },
      limits: {
        aiCaptionsPerMonth: config.aiCaptionsPerMonth,
        aiImagesPerMonth: config.aiImagesPerMonth,
      },
      paypalSubscriptionId: subscriptionId,
      updatedAt: FieldValue.serverTimestamp(),
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

    await adminDb.collection("users").doc(uid).set(
      {
        activeCompanyId: companyId,
      },
      { merge: true },
    );
  } else {
    await adminDb
      .collection("companies")
      .doc(companyId)
      .set(
        {
          plan: config.plan,
          planStatus: "active",
          features: { aiEnabled: config.aiEnabled },
          limits: {
            aiCaptionsPerMonth: config.aiCaptionsPerMonth,
            aiImagesPerMonth: config.aiImagesPerMonth,
          },
          paypalSubscriptionId: subscriptionId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    const memRef = adminDb
      .collection("memberships")
      .doc(membershipId(uid, companyId));
    const memSnap = await memRef.get();
    if (!memSnap.exists) {
      await memRef.set({
        uid,
        companyId,
        role: "admin",
        email,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await adminDb
      .collection("users")
      .doc(uid)
      .set({ activeCompanyId: companyId }, { merge: true });
  }

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

  return { ok: true, companyId, uid, isNewUser };
}

export async function cancelPayPalSubscription(subscriptionId: string) {
  const ref = adminDb.collection("subscriptions").doc(subscriptionId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data()!;
  await ref.update({
    status: "cancelled",
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (data.companyId) {
    await adminDb
      .collection("companies")
      .doc(data.companyId)
      .update({
        plan: "free",
        planStatus: "cancelled",
        features: { aiEnabled: false },
        limits: {
          aiCaptionsPerMonth: 15,
          aiImagesPerMonth: 3,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
  }
}
