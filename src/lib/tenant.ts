import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MemberRole } from "@/types";
import { PlanId } from "@/content/plans";

/** Límites por plan (ajusta cuando tengas Stripe) */
export const PLAN_LIMITS = {
  free: {
    aiEnabled: false,
    aiCaptionsPerMonth: 0,
    aiImagesPerMonth: 0,
    platforms: [] as string[],
  },
  basic: {
    aiEnabled: false,
    aiCaptionsPerMonth: 0,
    aiImagesPerMonth: 0,
    platforms: ["facebook", "instagram", "youtube"],
  },
  premium: {
    aiEnabled: true,
    aiCaptionsPerMonth: 100,
    aiImagesPerMonth: 30,
    platforms: ["facebook", "instagram", "youtube", "linkedin", "tiktok"],
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export function membershipId(uid: string, companyId: string) {
  return `${uid}_${companyId}`;
}

export function usagePeriodKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // "2026-10"
}

export async function createCompany(params: {
  uid: string;
  email: string;
  displayName?: string;
  companyName?: string;
}) {
  const { uid, email, displayName, companyName } = params;
  const companyRef = doc(collection(db, "companies"));
  const companyId = companyRef.id;
  const limits = PLAN_LIMITS.free;

  await setDoc(companyRef, {
    name: (companyName || "").trim(),
    logoUrl: null,
    aiInstructions: "",
    createdAt: serverTimestamp(),
    createdBy: uid,
    plan: "free",
    planStatus: "active",
    features: {
      aiEnabled: limits.aiEnabled,
    },
    limits: {
      aiCaptionsPerMonth: limits.aiCaptionsPerMonth,
      aiImagesPerMonth: limits.aiImagesPerMonth,
    },
  });

  await setDoc(doc(db, "memberships", membershipId(uid, companyId)), {
    email,
    name: displayName || email,
    uid,
    companyId,
    role: "admin" as MemberRole,
    createdAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "users", uid),
    {
      email,
      name: displayName || email,
      activeCompanyId: companyId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return companyId;
}

export async function getUserMemberships(uid: string) {
  const q = query(collection(db, "memberships"), where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getCompany(companyId: string) {
  const snap = await getDoc(doc(db, "companies", companyId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name || "",
    logoUrl: data.logoUrl || null,
    aiInstructions: data.aiInstructions || "",
    plan: data.plan || "free",
    planStatus: data.planStatus || "active",
    features: data.features || { aiEnabled: true },
    limits: data.limits || PLAN_LIMITS.free,
    ...data,
  };
}

export async function getMembership(uid: string, companyId: string) {
  const snap = await getDoc(
    doc(db, "memberships", membershipId(uid, companyId)),
  );
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    uid: data.uid,
    companyId: data.companyId,
    role: data.role as MemberRole,
    ...data,
  };
}

/** Uso del mes actual */
export async function getAiUsage(companyId: string) {
  const period = usagePeriodKey();
  const snap = await getDoc(doc(db, "companies", companyId, "usage", period));
  if (!snap.exists()) {
    return { period, aiCaptions: 0, aiImages: 0 };
  }
  const d = snap.data();
  return {
    period,
    aiCaptions: d.aiCaptions || 0,
    aiImages: d.aiImages || 0,
  };
}

/**
 * Comprueba límite y suma 1 al contador.
 * type: "caption" | "image"
 * Llamar DESDE API routes (idealmente con Admin SDK más adelante).
 */
export async function consumeAiCredit(
  companyId: string,
  type: "caption" | "image",
) {
  const company = await getCompany(companyId);
  if (!company) throw new Error("Empresa no encontrada");

  const aiEnabled = company.features?.aiEnabled !== false;
  if (!aiEnabled) {
    throw new Error("Tu plan no incluye IA");
  }

  const limits = company.limits || PLAN_LIMITS.free;
  const usage = await getAiUsage(companyId);
  const period = usagePeriodKey();

  if (type === "caption") {
    const limit = limits.aiCaptionsPerMonth ?? 15;
    if (usage.aiCaptions >= limit) {
      throw new Error(
        `Límite de captions alcanzado (${limit}/mes). Mejora tu plan o espera al próximo mes.`,
      );
    }
    await setDoc(
      doc(db, "companies", companyId, "usage", period),
      {
        aiCaptions: increment(1),
        aiImages: usage.aiImages,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } else {
    const limit = limits.aiImagesPerMonth ?? 3;
    if (usage.aiImages >= limit) {
      throw new Error(
        `Límite de imágenes IA alcanzado (${limit}/mes). Mejora tu plan o espera al próximo mes.`,
      );
    }
    await setDoc(
      doc(db, "companies", companyId, "usage", period),
      {
        aiImages: increment(1),
        aiCaptions: usage.aiCaptions,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}
export function getEffectivePlan(company: any) {
  const now = Date.now();

  const courtesy = company?.courtesy;
  if (
    courtesy?.active &&
    courtesy?.until &&
    new Date(courtesy.until).getTime() > now
  ) {
    const tier = (courtesy.plan || "premium") as PlanId;
    return fromTier(tier, courtesy.limits, "courtesy");
  }

  const partner = company?.partner;
  if (
    partner?.active &&
    (!partner.until || new Date(partner.until).getTime() > now)
  ) {
    const tier = (partner.tier || "premium") as PlanId;
    return fromTier(tier, partner.limits, "partner");
  }

  const plan = (company?.plan || "free") as PlanId;
  return fromTier(plan, company?.limits, company?.planSource || "free");
}

function fromTier(tier: PlanId | string, limits: any, source: string) {
  const planKey = (tier as PlanId) || "free";
  const defaults = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;

  // IA solo premium (ajusta si basic también tiene IA)
  const aiEnabled = planKey === "premium";

  return {
    plan: planKey,
    planStatus: "active",
    aiEnabled,
    limits: {
      aiCaptionsPerMonth:
        limits?.aiCaptionsPerMonth ?? defaults.aiCaptionsPerMonth ?? 0,
      aiImagesPerMonth:
        limits?.aiImagesPerMonth ?? defaults.aiImagesPerMonth ?? 0,
    },
    source,
  };
}

function buildFromTier(
  tier: string,
  limits: any,
  meta: {
    source: string;
    courtesyActive: boolean;
    partnerActive: boolean;
    until: string | null;
  },
) {
  const planKey = tier as keyof typeof PLAN_LIMITS;
  const defaults = PLAN_LIMITS[planKey] || PLAN_LIMITS.premium;

  return {
    plan: planKey,
    planStatus: "active",
    aiEnabled: true,
    limits: {
      aiCaptionsPerMonth:
        limits?.aiCaptionsPerMonth ?? defaults.aiCaptionsPerMonth,
      aiImagesPerMonth: limits?.aiImagesPerMonth ?? defaults.aiImagesPerMonth,
    },
    source: meta.source,
    courtesyActive: meta.courtesyActive,
    partnerActive: meta.partnerActive,
    until: meta.until,
  };
}
