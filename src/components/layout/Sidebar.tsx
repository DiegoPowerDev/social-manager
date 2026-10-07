"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Image as ImageIcon, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/useAuthStore";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { mainNav } from "@/content/menu";

const secondaryNav = [
  {
    title: "Media Library",
    href: "/media",
    icon: ImageIcon,
  },
  {
    title: "Equipo",
    href: "/team",
    icon: Users,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { appUser, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    logout();
    router.push("/login");
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-background">
      {/* Logo / Nombre */}
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            SP
          </div>
          <span className="text-black">Social Publisher</span>
        </Link>
      </div>

      {/* Navegación principal */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid gap-1 px-3">
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.icon ? <item.icon className="h-4 w-4" /> : item.image}
                {item.title}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4" />

        <nav className="grid gap-1 px-3">
          {secondaryNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground  hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Usuario / Logout */}
      <div className="border-t p-4">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium">{appUser?.name || "Usuario"}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {appUser?.role || "—"} · {appUser?.email}
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-black hover:bg-black/10"
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
