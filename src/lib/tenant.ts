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

export const PLAN_LIMITS = {
  free: {
    aiEnabled: false,
    aiCaptionsPerMonth: 0,
    aiImagesPerMonth: 0,
    storageBytes: 500 * 1024 * 1024, // 500 MB
    platforms: [] as string[],
  },
  basic: {
    aiEnabled: false,
    aiCaptionsPerMonth: 0,
    aiImagesPerMonth: 0,
    storageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    platforms: ["facebook", "instagram", "youtube"],
  },
  premium: {
    aiEnabled: true,
    aiCaptionsPerMonth: 100,
    aiImagesPerMonth: 30,
    storageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
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
  return `${y}-${m}`;
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
    planSource: "billing",
    features: {
      aiEnabled: limits.aiEnabled,
    },
    limits: {
      aiCaptionsPerMonth: limits.aiCaptionsPerMonth,
      aiImagesPerMonth: limits.aiImagesPerMonth,
      storageBytes: limits.storageBytes,
    },
    storageUsedBytes: 0,
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
    // default sin IA (antes estaba aiEnabled: true)
    features: data.features || { aiEnabled: false },
    limits: data.limits || {
      aiCaptionsPerMonth: PLAN_LIMITS.free.aiCaptionsPerMonth,
      aiImagesPerMonth: PLAN_LIMITS.free.aiImagesPerMonth,
      storageBytes: PLAN_LIMITS.free.storageBytes,
    },
    storageUsedBytes: data.storageUsedBytes ?? 0,
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
 * Preferible usar consumeAiCreditAdmin en API routes.
 * Si se usa en cliente, respeta plan efectivo (cortesía/socio/premium).
 */
export async function consumeAiCredit(
  companyId: string,
  type: "caption" | "image",
) {
  const company = await getCompany(companyId);
  if (!company) throw new Error("Empresa no encontrada");

  const effective = getEffectivePlan(company);
  if (!effective.aiEnabled) {
    throw new Error("Tu plan no incluye IA");
  }

  const limits = effective.limits;
  const usage = await getAiUsage(companyId);
  const period = usagePeriodKey();

  if (type === "caption") {
    const limit = limits.aiCaptionsPerMonth ?? 0;
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
    const limit = limits.aiImagesPerMonth ?? 0;
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

/** Plan efectivo: cortesía > socio > facturación. IA solo en premium. */
export function getEffectivePlan(company: any) {
  const now = Date.now();

  const courtesy = company?.courtesy;
  if (courtesy?.active) {
    const untilOk = !courtesy.until || new Date(courtesy.until).getTime() > now;
    if (untilOk) {
      const tier = (courtesy.plan || "premium") as PlanId;
      return fromTier(tier, courtesy.limits, "courtesy");
    }
  }

  const partner = company?.partner;
  if (partner?.active) {
    const untilOk = !partner.until || new Date(partner.until).getTime() > now;
    if (untilOk) {
      const tier = (partner.tier || "premium") as PlanId;
      return fromTier(tier, partner.limits, "partner");
    }
  }

  const plan = (company?.plan || "free") as PlanKey;
  const defaults = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  if (plan === "premium") {
    return {
      plan: "premium" as const,
      planStatus: "active" as const,
      aiEnabled: true,
      limits: {
        aiCaptionsPerMonth:
          company?.limits?.aiCaptionsPerMonth ?? defaults.aiCaptionsPerMonth,
        aiImagesPerMonth:
          company?.limits?.aiImagesPerMonth ?? defaults.aiImagesPerMonth,
        storageBytes: company?.limits?.storageBytes ?? defaults.storageBytes,
      },
      source: "billing" as const,
    };
  }

  // free | basic (y legacy que caiga aquí)
  return {
    plan: plan === "basic" ? ("basic" as const) : ("free" as const),
    planStatus: company?.planStatus || "active",
    aiEnabled: false,
    limits: {
      aiCaptionsPerMonth: 0,
      aiImagesPerMonth: 0,
      storageBytes: company?.limits?.storageBytes ?? defaults.storageBytes,
    },
    source: "billing" as const,
  };
}

function fromTier(tier: PlanId | string, limits: any, source: string) {
  const planKey = (tier as PlanKey) in PLAN_LIMITS ? (tier as PlanKey) : "free";
  const defaults = PLAN_LIMITS[planKey];
  const aiEnabled = planKey === "premium";

  return {
    plan: planKey,
    planStatus: "active" as const,
    aiEnabled,
    limits: {
      aiCaptionsPerMonth:
        limits?.aiCaptionsPerMonth ?? defaults.aiCaptionsPerMonth ?? 0,
      aiImagesPerMonth:
        limits?.aiImagesPerMonth ?? defaults.aiImagesPerMonth ?? 0,
      storageBytes: limits?.storageBytes ?? defaults.storageBytes,
    },
    source,
  };
}
