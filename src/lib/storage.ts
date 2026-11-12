export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function defaultStorageLimit(plan?: string | null): number {
  if (plan === "free" || !plan) return 500 * 1024 * 1024;
  return 10 * 1024 * 1024 * 1024;
}

export function storageLimitForPlan(
  plan: string,
  companyLimits?: { storageBytes?: number } | null,
): number {
  if (companyLimits?.storageBytes != null) return companyLimits.storageBytes;
  if (plan === "free") return 500 * 1024 * 1024;
  return 10 * 1024 * 1024 * 1024; // basic, premium, socio, etc.
}

/** true si cabe fileSize bytes más */
export function canStore(used: number, limit: number, fileSize: number) {
  return used + fileSize <= limit;
}
