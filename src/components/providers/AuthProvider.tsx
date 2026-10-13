"use client";

import { useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { AppUser } from "@/types";
import {
  getCompany,
  getMembership,
  getUserMemberships,
  PLAN_LIMITS,
} from "@/lib/tenant";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAppUser, setLoading, logout, setTenant } = useAuthStore();

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

        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

        if (!userDoc.exists()) {
          console.error("No existe users/" + firebaseUser.uid);
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
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as AppUser);

        let activeCompanyId = data.activeCompanyId as string | undefined;

        if (!activeCompanyId) {
          const memberships = await getUserMemberships(firebaseUser.uid);
          if (memberships.length > 0) {
            activeCompanyId = (memberships[0] as any).companyId as string;
            await setDoc(
              doc(db, "users", firebaseUser.uid),
              { activeCompanyId },
              { merge: true },
            );
          } else {
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

        const planKey = (company.plan || "free") as keyof typeof PLAN_LIMITS;
        const defaults = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
        const limits = company.limits || defaults;

        setTenant({
          companyId: activeCompanyId,
          companyName: company.name || null,
          companyLogo: company.logoUrl || null,
          memberRole: membership.role,
          plan: company.plan || "free",
          aiEnabled: company.features?.aiEnabled !== false,
          aiCaptionsLimit:
            limits.aiCaptionsPerMonth ?? defaults.aiCaptionsPerMonth,
          aiImagesLimit: limits.aiImagesPerMonth ?? defaults.aiImagesPerMonth,
        });
      } catch (error) {
        console.error("Error en AuthProvider:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setUser, setAppUser, setLoading, logout, setTenant]);

  return <>{children}</>;
}
