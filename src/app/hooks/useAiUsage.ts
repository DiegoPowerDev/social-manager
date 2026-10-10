"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { usagePeriodKey } from "@/lib/tenant";

export function useAiUsage() {
  const companyId = useAuthStore((s) => s.companyId);
  const aiCaptionsLimit = useAuthStore((s) => s.aiCaptionsLimit);
  const aiImagesLimit = useAuthStore((s) => s.aiImagesLimit);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);

  const [captionsUsed, setCaptionsUsed] = useState(0);
  const [imagesUsed, setImagesUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const period = usagePeriodKey();
      const snap = await getDoc(
        doc(db, "companies", companyId, "usage", period),
      );
      if (snap.exists()) {
        const d = snap.data();
        setCaptionsUsed(d.aiCaptions || 0);
        setImagesUsed(d.aiImages || 0);
      } else {
        setCaptionsUsed(0);
        setImagesUsed(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    aiEnabled,
    captionsUsed,
    imagesUsed,
    captionsLimit: aiCaptionsLimit || 15,
    imagesLimit: aiImagesLimit || 3,
    captionsLeft: Math.max(0, (aiCaptionsLimit || 15) - captionsUsed),
    imagesLeft: Math.max(0, (aiImagesLimit || 3) - imagesUsed),
    loading,
    refresh,
    setFromApi: (usage: { aiCaptions: number; aiImages: number }) => {
      setCaptionsUsed(usage.aiCaptions);
      setImagesUsed(usage.aiImages);
    },
  };
}
