"use client";

import { useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { AppUser } from "@/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAppUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          if (userDoc.exists()) {
            const data = userDoc.data();
            setAppUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: data.name || "Usuario",
              role: data.role || "viewer",
              createdAt: data.createdAt?.toDate?.() || new Date(),
            } as AppUser);
          } else {
            await signOut(auth);
            logout();
          }
        } else {
          setUser(null);
          setAppUser(null);
        }
      } catch (error) {
        console.error("Error en AuthProvider:", error);
        setUser(null);
        setAppUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setUser, setAppUser, setLoading, logout]);

  return <>{children}</>;
}
