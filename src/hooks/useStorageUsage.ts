"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { defaultStorageLimit, formatBytes } from "@/lib/storage";

export function useStorageUsage() {
  const companyId = useAuthStore((s) => s.companyId);
  const plan = useAuthStore((s) => s.plan);
  const storageLimitFromTenant = useAuthStore((s) => s.storageLimit);

  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(
    storageLimitFromTenant || defaultStorageLimit(plan),
  );

  useEffect(() => {
    if (!companyId) {
      setUsed(0);
      setLimit(storageLimitFromTenant || defaultStorageLimit(plan));
      return;
    }

    const unsub = onSnapshot(doc(db, "companies", companyId), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      setUsed(Number(d.storageUsedBytes) || 0);
      const fromDoc = d.limits?.storageBytes as number | undefined;
      setLimit(
        fromDoc ??
          storageLimitFromTenant ??
          defaultStorageLimit(d.plan || plan),
      );
    });

    return () => unsub();
  }, [companyId, plan, storageLimitFromTenant]);

  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const remaining = Math.max(0, limit - used);

  return {
    used,
    limit,
    remaining,
    pct,
    full: limit > 0 && used >= limit,
    nearFull: pct >= 90 && pct < 100,
    label: `${formatBytes(used)} / ${formatBytes(limit)}`,
  };
}
