"use client";

import { useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { getCompany, getMembership, getEffectivePlan } from "@/lib/tenant";
import type { MemberRole } from "@/types";

const emptyTenant = {
  companyId: null as string | null,
  companyName: null as string | null,
  memberRole: null as MemberRole | null,
  companyLogo: null as string | null,
  plan: null as string | null,
  aiEnabled: false,
  aiCaptionsLimit: 0,
  aiImagesLimit: 0,
  storageLimit: 0,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAppUser, setLoading, logout, setTenant, tenantTick } =
    useAuthStore();

  const applyingRef = useRef(false);

  const applyTenant = useCallback(
    async (firebaseUser: {
      uid: string;
      email?: string | null;
      displayName?: string | null;
    }) => {
      if (applyingRef.current) return;
      applyingRef.current = true;

      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

        if (!userDoc.exists()) {
          await signOut(auth);
          setUser(null);
          setAppUser(null);
          setTenant(emptyTenant);
          logout();
          return;
        }

        const data = userDoc.data();

        setAppUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: data.name || data.displayName || "Usuario",
          role: data.role || "viewer",
          isSuperAdmin: data.isSuperAdmin === true,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as any);

        const activeCompanyId = data.activeCompanyId as string | undefined;

        if (!activeCompanyId) {
          setTenant(emptyTenant);
          return;
        }

        const [membership, company] = await Promise.all([
          getMembership(firebaseUser.uid, activeCompanyId),
          getCompany(activeCompanyId),
        ]);

        if (!membership || !company) {
          setTenant(emptyTenant);
          return;
        }

        const effective = getEffectivePlan(company);

        setTenant({
          companyId: activeCompanyId,
          companyName: company.name || null,
          companyLogo: company.logoUrl || null,
          memberRole: membership.role,
          plan: effective.plan,
          aiEnabled: effective.aiEnabled,
          aiCaptionsLimit: effective.limits.aiCaptionsPerMonth ?? 0,
          aiImagesLimit: effective.limits.aiImagesPerMonth ?? 0,
          storageLimit: effective.limits.storageBytes ?? 0,
        });
      } finally {
        applyingRef.current = false;
      }
    },
    [setAppUser, setTenant, setUser, logout],
  );

  useEffect(() => {
    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          setAppUser(null);
          setTenant(emptyTenant);
          return;
        }

        setUser(firebaseUser);
        await applyTenant(firebaseUser);
      } catch (e) {
        console.error("AuthProvider:", e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [applyTenant, setUser, setAppUser, setTenant, setLoading]);

  useEffect(() => {
    if (tenantTick === 0) return;
    const user = auth.currentUser;
    if (!user) return;
    applyTenant(user).catch(console.error);
  }, [tenantTick, applyTenant]);

  useEffect(() => {
    const onFocus = () => {
      const user = auth.currentUser;
      if (user) applyTenant(user).catch(console.error);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [applyTenant]);

  return <>{children}</>;
}
