"use client";

import { useEffect, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { getCompany, getMembership, getEffectivePlan } from "@/lib/tenant";
// ajusta imports a tu proyecto

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAppUser, setLoading, logout, setTenant, tenantTick } =
    useAuthStore();

  const applyTenant = useCallback(
    async (firebaseUser: {
      uid: string;
      email?: string | null;
      displayName?: string | null;
    }) => {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      if (!userDoc.exists()) {
        await signOut(auth);
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

      let activeCompanyId = data.activeCompanyId as string | undefined;
      if (!activeCompanyId) {
        setTenant({
          companyId: null,
          companyName: null,
          memberRole: null,
          companyLogo: null,
          plan: null,
          aiEnabled: false,
          aiCaptionsLimit: 0,
          aiImagesLimit: 0,
        });
        return;
      }

      const [membership, company] = await Promise.all([
        getMembership(firebaseUser.uid, activeCompanyId),
        getCompany(activeCompanyId),
      ]);

      if (!membership || !company) {
        setTenant({
          companyId: null,
          companyName: null,
          memberRole: null,
          companyLogo: null,
          plan: null,
          aiEnabled: false,
          aiCaptionsLimit: 0,
          aiImagesLimit: 0,
        });
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
        aiCaptionsLimit: effective.limits.aiCaptionsPerMonth,
        aiImagesLimit: effective.limits.aiImagesPerMonth,
      });
    },
    [setAppUser, setTenant, logout],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          setAppUser(null);
          setTenant({
            companyId: null,
            companyName: null,
            memberRole: null,
            companyLogo: null,
            plan: null,
            aiEnabled: false,
            aiCaptionsLimit: 0,
            aiImagesLimit: 0,
          });
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

  // Revalidar cuando invalidateTenant() o al volver a la pestaña
  useEffect(() => {
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
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onFocus();
    });
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [applyTenant]);

  return <>{children}</>;
}
