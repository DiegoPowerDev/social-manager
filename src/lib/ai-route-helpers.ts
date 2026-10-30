import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { CompanyDoc } from "@/types";

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
  free: { aiCaptionsPerMonth: 0, aiImagesPerMonth: 0, aiEnabled: false },
  basic: { aiCaptionsPerMonth: 0, aiImagesPerMonth: 0, aiEnabled: false },
  premium: { aiCaptionsPerMonth: 100, aiImagesPerMonth: 30, aiEnabled: true },
} as const;

function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Firestore Timestamp (admin o client)
  if (typeof value === "object" && value !== null) {
    const v = value as {
      toDate?: () => Date;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof v.toDate === "function") {
      try {
        return v.toDate();
      } catch {
        /* ignore */
      }
    }
    const sec = v.seconds ?? v._seconds;
    if (typeof sec === "number") return new Date(sec * 1000);
  }
  return null;
}

/** true si no hay fecha o aún no venció */
function isUntilValid(until: unknown): boolean {
  const d = toDate(until);
  if (!d) return true; // sin hasta = vigente
  return d.getTime() > Date.now();
}

export function getEffectivePlanFromCompany(
  company: CompanyDoc,
): EffectivePlan {
  // 1) Cortesía
  const courtesy = company?.courtesy;
  if (courtesy?.active === true && isUntilValid(courtesy.until)) {
    const plan = (courtesy.plan || "premium") as EffectivePlan["plan"];
    const base = DEFAULT_LIMITS[plan] || DEFAULT_LIMITS.premium;
    return {
      plan,
      aiEnabled: plan === "premium",
      limits: {
        aiCaptionsPerMonth:
          courtesy.limits?.aiCaptionsPerMonth ?? base.aiCaptionsPerMonth,
        aiImagesPerMonth:
          courtesy.limits?.aiImagesPerMonth ?? base.aiImagesPerMonth,
      },
      source: "courtesy",
    };
  }

  // 2) Socio
  const partner = company?.partner;
  if (partner?.active === true && isUntilValid(partner.until)) {
    const plan = (partner.tier === "basic" ? "basic" : "premium") as
      | "basic"
      | "premium";
    const base = DEFAULT_LIMITS[plan];
    return {
      plan,
      aiEnabled: plan === "premium",
      limits: {
        aiCaptionsPerMonth:
          partner.limits?.aiCaptionsPerMonth ?? base.aiCaptionsPerMonth,
        aiImagesPerMonth:
          partner.limits?.aiImagesPerMonth ?? base.aiImagesPerMonth,
      },
      source: "partner",
    };
  }

  // 3) Facturación
  const plan = (company?.plan || "free") as "free" | "basic" | "premium";
  const base = DEFAULT_LIMITS[plan] || DEFAULT_LIMITS.free;

  // Solo el plan de cobro mira features; cortesía/socio ya salieron arriba
  let aiEnabled = base.aiEnabled;
  if (company?.features?.aiEnabled === false) aiEnabled = false;
  if (company?.features?.aiEnabled === true) aiEnabled = true;
  // premium de pago siempre IA
  if (plan === "premium") aiEnabled = true;

  if (plan === "premium") {
    return {
      plan: "premium",
      aiEnabled: true,
      limits: {
        aiCaptionsPerMonth: company?.limits?.aiCaptionsPerMonth ?? 100,
        aiImagesPerMonth: company?.limits?.aiImagesPerMonth ?? 30,
      },
      source: "billing",
    };
  }

  return {
    plan,
    aiEnabled,
    limits: {
      aiCaptionsPerMonth: 0,
      aiImagesPerMonth: 0,
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
