"use client";

import { mainNav, secondaryNav, adminOption, type Menu } from "@/content/menu";
import { canAccessSection } from "@/content/access";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/useAuthStore";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

import Image from "next/image";

export function Sidebar() {
  const pathname = usePathname();
  const { appUser, logout, companyName, companyLogo, plan, memberRole } =
    useAuthStore();
  const isSuperAdmin = appUser?.isSuperAdmin === true;
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    logout();
    router.push("/login");
  };

  const renderNavItem = (item: Menu) => {
    const { visible, locked } = canAccessSection(item.href, {
      plan,
      role: memberRole,
      isSuperAdmin,
    });

    if (!visible) return null;

    const isActive =
      pathname === item.href || pathname.startsWith(item.href + "/dashboard");

    if (locked) {
      return (
        <Link
          key={item.href}
          href="/dashboard/membresia"
          title="Mejora tu plan para usar esta sección"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium opacity-50 hover:opacity-80",
          )}
        >
          {item.icon ? <item.icon className="h-4 w-4" /> : item.image}
          <span className="flex-1">{item.title}</span>
          <Lock className="h-3.5 w-3.5 shrink-0" />
        </Link>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-white"
            : "hover:bg-muted hover:text-foreground",
        )}
      >
        {item.icon ? <item.icon className="h-4 w-4" /> : item.image}
        {item.title}
      </Link>
    );
  };

  return (
    <aside className="flex h-screen w-64 flex-col text-white bg-yellow-500/20 backdrop-blur-xs">
      <div className="flex flex-col justify-center">
        <Link
          href="/"
          className="flex items-center gap-2 justify-center font-semibold bg-white/70"
        >
          <Image
            src="/logo-horizontal.webp"
            loading="eager"
            width={120}
            height={220}
            alt="logo"
            className="object-contain rounded"
          />
        </Link>
        <div className="flex items-center p-3 border-b gap-4 select-none">
          {companyLogo && (
            <img
              src={companyLogo}
              className="h-8 w-8 rounded-md object-cover"
              alt=""
            />
          )}
          <div className="min-w-0">
            <span className="block truncate">
              {companyName || "Tu empresa"}
            </span>
            {plan && (
              <span className="text-xs opacity-80 capitalize">{plan}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid gap-1 px-3">{mainNav.map(renderNavItem)}</nav>

        <Separator className="my-4 bg-yellow-200/30" />

        <nav className="grid gap-1 px-3">{secondaryNav.map(renderNavItem)}</nav>

        {appUser?.isSuperAdmin && (
          <nav className="grid gap-1 px-3 mt-2">
            {adminOption.map(renderNavItem)}
          </nav>
        )}
      </div>

      <div className="p-4">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium">{appUser?.name || "Usuario"}</p>
          <p className="text-xs capitalize">
            {memberRole || appUser?.role || "—"} · {appUser?.email}
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full gap-2 text-black hover:text-white hover:bg-black/10"
          size="sm"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
