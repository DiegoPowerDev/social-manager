import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { PLAN_LIMITS, usagePeriodKey } from "@/lib/tenant";

export async function getCompanyAdmin(companyId: string) {
  const snap = await adminDb.collection("companies").doc(companyId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
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

export async function getAiUsageAdmin(companyId: string) {
  const period = usagePeriodKey();
  const snap = await adminDb
    .collection("companies")
    .doc(companyId)
    .collection("usage")
    .doc(period)
    .get();

  if (!snap.exists) {
    return { period, aiCaptions: 0, aiImages: 0 };
  }
  const d = snap.data()!;
  return {
    period,
    aiCaptions: d.aiCaptions || 0,
    aiImages: d.aiImages || 0,
  };
}

/** Usar SOLO en API routes (bypass rules) */
export async function consumeAiCreditAdmin(
  companyId: string,
  type: "caption" | "image",
) {
  const company = await getCompanyAdmin(companyId);
  if (!company) throw new Error("Empresa no encontrada");

  if (company.features?.aiEnabled === false) {
    throw new Error("Tu plan no incluye IA");
  }

  const limits = company.limits || PLAN_LIMITS.free;
  const usage = await getAiUsageAdmin(companyId);
  const period = usagePeriodKey();
  const usageRef = adminDb
    .collection("companies")
    .doc(companyId)
    .collection("usage")
    .doc(period);

  if (type === "caption") {
    const limit = limits.aiCaptionsPerMonth ?? 15;
    if (usage.aiCaptions >= limit) {
      throw new Error(
        `Límite de captions alcanzado (${limit}/mes). Mejora tu plan o espera al próximo mes.`,
      );
    }
    await usageRef.set(
      {
        aiCaptions: FieldValue.increment(1),
        aiImages: usage.aiImages,
        updatedAt: FieldValue.serverTimestamp(),
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
    await usageRef.set(
      {
        aiImages: FieldValue.increment(1),
        aiCaptions: usage.aiCaptions,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}
