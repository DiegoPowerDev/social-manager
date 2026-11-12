import { adminDb, FieldValue } from "@/lib/firebase-admin";
import { storageLimitForPlan } from "@/lib/storage";

export async function getCompanyStorage(companyId: string) {
  const snap = await adminDb.collection("companies").doc(companyId).get();
  if (!snap.exists) throw new Error("Empresa no encontrada");
  const data = snap.data()!;
  // Reutiliza tu getEffectivePlanFromCompany si ya lo tienes en el cron
  const plan = data.plan || "free";
  const used = Number(data.storageUsedBytes) || 0;
  const limit =
    data.limits?.storageBytes ?? storageLimitForPlan(plan, data.limits);
  return { used, limit, data };
}

/** Lanza Error con mensaje claro si no cabe */
export async function assertCanUpload(companyId: string, fileSize: number) {
  const { used, limit } = await getCompanyStorage(companyId);
  if (used + fileSize > limit) {
    const err: any = new Error(
      `Almacenamiento lleno (${formatMsg(used)} de ${formatMsg(limit)}). Borra archivos o mejora tu plan.`,
    );
    err.code = "STORAGE_FULL";
    throw err;
  }
  return { used, limit };
}

export async function incrementStorage(companyId: string, bytes: number) {
  if (bytes <= 0) return;
  await adminDb
    .collection("companies")
    .doc(companyId)
    .set(
      {
        storageUsedBytes: FieldValue.increment(bytes),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function decrementStorage(companyId: string, bytes: number) {
  if (bytes <= 0) return;
  const { used } = await getCompanyStorage(companyId);
  const next = Math.max(0, used - bytes);
  await adminDb.collection("companies").doc(companyId).set(
    {
      storageUsedBytes: next,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

function formatMsg(n: number) {
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
