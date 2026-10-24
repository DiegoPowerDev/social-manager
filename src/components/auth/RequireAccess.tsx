"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { canAccessSection, sectionKeyFromHref } from "@/content/access";
import { LucideLoaderCircle } from "lucide-react";

export function RequireSectionAccess({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const loading = useAuthStore((s) => s.loading);
  const memberRole = useAuthStore((s) => s.memberRole);
  const plan = useAuthStore((s) => s.plan);
  const isSuperAdmin = useAuthStore((s) => s.appUser?.isSuperAdmin === true);

  // Misma clave que el menú: /dashboard/instagram → regla instagram
  const href = pathname.startsWith("/dashboard")
    ? pathname.replace(/\/$/, "") || "/dashboard"
    : pathname;

  const { visible, locked } = canAccessSection(href, {
    plan,
    role: memberRole,
    isSuperAdmin,
  });

  const key = sectionKeyFromHref(href);
  const isAdminSection = key === "admin";

  useEffect(() => {
    if (loading) return;

    if (isAdminSection && !isSuperAdmin) {
      router.replace("/dashboard");
      return;
    }

    // Rol no permitido (p. ej. viewer en Instagram)
    if (!visible) {
      router.replace("/dashboard");
      return;
    }

    // Plan insuficiente
    if (locked) {
      router.replace("/dashboard/membresia");
    }
  }, [loading, visible, locked, isAdminSection, isSuperAdmin, router]);

  if (loading || !visible || locked) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LucideLoaderCircle className="h-10 w-10 animate-spin text-yellow-200" />
      </div>
    );
  }

  return <>{children}</>;
}
