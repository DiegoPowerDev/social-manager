import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { randomBytes } from "crypto";
import { sendHostingerEmail } from "./hostinger-mail";

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
  return randomBytes(9).toString("base64url"); // ~12 chars
}

async function sendWelcomeEmail(opts: {
  to: string;
  password?: string;
  isNew: boolean;
  plan: string;
}) {
  const login = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.trendly.studio"}/login`;
  const subject = opts.isNew
    ? "Tu cuenta TrendlyStudio está lista"
    : "Tu plan de TrendlyStudio se actualizó";

  const html = opts.isNew
    ? `<p>Hola,</p><p>Plan <strong>${opts.plan}</strong> activo.</p>
       <p>Email: ${opts.to}<br/>Contraseña temporal: <code>${opts.password}</code></p>
       <p><a href="${login}">Iniciar sesión</a></p><p>— TrendlyStudio</p>`
    : `<p>Hola,</p><p>Plan actualizado a <strong>${opts.plan}</strong>.</p>
       <p><a href="${login}">Ir al panel</a></p><p>— TrendlyStudio</p>`;

  try {
    await sendHostingerEmail({ to: opts.to, subject, html });
  } catch (e) {
    console.warn("Welcome email failed:", e);
    if (opts.isNew && opts.password) {
      console.log("SANDBOX NEW USER", opts.to, opts.password);
    }
  }
}

/**
 * Activa o crea empresa tras suscripción PayPal.
 * - Si companyId existe y != "new": upgrade de esa empresa (debe existir).
 * - Si no: busca usuario por email o crea Auth + company + membership admin.
 */
export async function provisionFromPayPal(opts: {
  email: string | null;
  subscriptionId: string;
  planKey: string;
  companyId?: string | null;
}) {
  const planKey = (opts.planKey || "premium_monthly") as PayPalPlanKey;
  const config = PLAN_CONFIG[planKey] || PLAN_CONFIG.premium_monthly;
  const email = opts.email?.trim().toLowerCase() || null;
  const subscriptionId = opts.subscriptionId;

  // Idempotencia: si ya guardamos esta subscription, no duplicar
  const existingSub = await adminDb
    .collection("subscriptions")
    .doc(subscriptionId)
    .get();
  if (existingSub.exists && existingSub.data()?.status === "active") {
    return {
      ok: true,
      skipped: true,
      companyId: existingSub.data()?.companyId,
    };
  }

  let companyId =
    opts.companyId && opts.companyId !== "new" ? opts.companyId : null;
  let uid: string | null = null;
  let isNewUser = false;
  let plainPassword: string | undefined;

  // --- Usuario por email ---
  if (email) {
    try {
      const user = await getAuth().getUserByEmail(email);
      uid = user.uid;
    } catch {
      // no existe → crear
      plainPassword = tempPassword();
      const created = await getAuth().createUser({
        email,
        password: plainPassword,
        emailVerified: false,
      });
      uid = created.uid;
      isNewUser = true;

      await adminDb
        .collection("users")
        .doc(uid)
        .set(
          {
            email,
            name: email.split("@")[0],
            role: "admin",
            createdAt: FieldValue.serverTimestamp(),
            activeCompanyId: null,
          },
          { merge: true },
        );
    }
  }

  // --- Empresa existente (upgrade) ---
  if (companyId) {
    const companyRef = adminDb.collection("companies").doc(companyId);
    const snap = await companyRef.get();
    if (!snap.exists) {
      companyId = null; // crear nueva abajo
    } else {
      await companyRef.update({
        plan: config.plan,
        planStatus: "active",
        planInterval: config.interval,
        paypalSubscriptionId: subscriptionId,
        features: {
          aiEnabled: config.aiEnabled,
        },
        limits: {
          aiCaptionsPerMonth: config.aiCaptionsPerMonth,
          aiImagesPerMonth: config.aiImagesPerMonth,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // --- Nueva empresa ---
  if (!companyId) {
    if (!uid || !email) {
      throw new Error(
        "ACTIVATED sin email ni companyId: no se puede provisionar",
      );
    }

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
      planInterval: config.interval,
      paypalSubscriptionId: subscriptionId,
      features: { aiEnabled: config.aiEnabled },
      limits: {
        aiCaptionsPerMonth: config.aiCaptionsPerMonth,
        aiImagesPerMonth: config.aiImagesPerMonth,
      },
    });

    const membershipId = `${uid}_${companyId}`;
    await adminDb.collection("memberships").doc(membershipId).set({
      uid,
      companyId,
      role: "admin",
      email,
      createdAt: FieldValue.serverTimestamp(),
    });

    await adminDb.collection("users").doc(uid).set(
      {
        activeCompanyId: companyId,
        email,
      },
      { merge: true },
    );
  } else if (uid && email) {
    // Asegurar membership si upgrade con usuario conocido
    const membershipId = `${uid}_${companyId}`;
    const m = await adminDb.collection("memberships").doc(membershipId).get();
    if (!m.exists) {
      await adminDb.collection("memberships").doc(membershipId).set({
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

  if (email) {
    await sendWelcomeEmail({
      to: email,
      password: plainPassword,
      isNew: isNewUser,
      plan: config.plan,
    });
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
