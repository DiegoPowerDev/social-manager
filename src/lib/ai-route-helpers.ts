import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export type EffectivePlan = {
  plan: "free" | "basic" | "premium";
  aiEnabled: boolean;
  limits: {
    aiCaptionsPerMonth: number;
    aiImagesPerMonth: number;
  };
  source: "billing" | "partner" | "courtesy";
};

const DEFAULT_LIMITS = {
  free: { aiCaptionsPerMonth: 15, aiImagesPerMonth: 3, aiEnabled: true },
  basic: { aiCaptionsPerMonth: 0, aiImagesPerMonth: 0, aiEnabled: false },
  premium: { aiCaptionsPerMonth: 100, aiImagesPerMonth: 30, aiEnabled: true },
} as const;

function isUntilValid(until?: string | null) {
  if (!until) return true;
  const t = new Date(until).getTime();
  return !Number.isNaN(t) && t > Date.now();
}

export function getEffectivePlanFromCompany(company: any): EffectivePlan {
  const courtesy = company?.courtesy;
  if (courtesy?.active && isUntilValid(courtesy.until)) {
    const plan = (courtesy.plan || "premium") as EffectivePlan["plan"];
    const base = DEFAULT_LIMITS[plan] || DEFAULT_LIMITS.premium;
    return {
      plan,
      aiEnabled: true,
      limits: {
        aiCaptionsPerMonth:
          courtesy.limits?.aiCaptionsPerMonth ?? base.aiCaptionsPerMonth,
        aiImagesPerMonth:
          courtesy.limits?.aiImagesPerMonth ?? base.aiImagesPerMonth,
      },
      source: "courtesy",
    };
  }

  const partner = company?.partner;
  if (partner?.active && isUntilValid(partner.until)) {
    const plan = (partner.tier === "basic" ? "basic" : "premium") as
      | "basic"
      | "premium";
    const base = DEFAULT_LIMITS[plan];
    return {
      plan,
      aiEnabled: true,
      limits: {
        aiCaptionsPerMonth:
          partner.limits?.aiCaptionsPerMonth ?? (plan === "basic" ? 100 : 150),
        aiImagesPerMonth:
          partner.limits?.aiImagesPerMonth ?? (plan === "basic" ? 30 : 50),
      },
      source: "partner",
    };
  }

  const plan = (company?.plan || "free") as EffectivePlan["plan"];
  const base = DEFAULT_LIMITS[plan] || DEFAULT_LIMITS.free;
  const featuresAi = company?.features?.aiEnabled;
  const aiEnabled =
    featuresAi === false ? false : featuresAi === true ? true : base.aiEnabled;

  return {
    plan,
    aiEnabled,
    limits: {
      aiCaptionsPerMonth:
        company?.limits?.aiCaptionsPerMonth ?? base.aiCaptionsPerMonth,
      aiImagesPerMonth:
        company?.limits?.aiImagesPerMonth ?? base.aiImagesPerMonth,
    },
    source: "billing",
  };
}

/** Verifica ID token sin firebase-admin/auth (evita crash jose/ESM en Vercel) */
async function verifyFirebaseIdToken(
  idToken: string,
): Promise<{ uid: string; email?: string }> {
  const apiKey =
    process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw Object.assign(
      new Error("FIREBASE_API_KEY no configurada en el servidor"),
      { status: 500 },
    );
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );

  const data = await res.json();

  if (!res.ok || !data.users?.[0]?.localId) {
    throw Object.assign(new Error("Token inválido o expirado"), {
      status: 401,
    });
  }

  const u = data.users[0];
  return { uid: u.localId as string, email: u.email as string | undefined };
}

export async function requireCompanyMember(
  req: NextRequest,
  companyId: string,
) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    throw Object.assign(new Error("No autenticado"), { status: 401 });
  }

  const { uid } = await verifyFirebaseIdToken(token);

  const membershipId = `${uid}_${companyId}`;
  const memSnap = await adminDb
    .collection("memberships")
    .doc(membershipId)
    .get();

  if (!memSnap.exists) {
    throw Object.assign(new Error("No perteneces a esta empresa"), {
      status: 403,
    });
  }

  const role = memSnap.data()?.role as string | undefined;
  if (role !== "admin" && role !== "editor") {
    throw Object.assign(new Error("Tu rol no puede usar IA"), {
      status: 403,
    });
  }

  return { uid, role };
}

export function jsonError(error: any) {
  const status = typeof error?.status === "number" ? error.status : 500;
  return {
    status,
    body: { error: error?.message || "Error interno" },
  };
}
