"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  CheckCircle2,
  Loader2,
  LucideLoaderCircle,
  XCircle,
} from "lucide-react";
import { cn } from "cn";
import { RequireSectionAccess } from "@/components/auth/RequireAccess";
import { auth } from "@/lib/firebase";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  const pathname = usePathname();
  const invalidateTenant = useAuthStore((s) => s.invalidateTenant);

  useEffect(() => {
    invalidateTenant();
  }, [pathname, invalidateTenant]);

  useEffect(() => {
    const id = setInterval(() => {
      if (auth.currentUser) {
        useAuthStore.getState().invalidateTenant();
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Usuario autenticado → mostramos el dashboard
  return (
    <div
      style={{ backgroundImage: `url("/background.webp")` }}
      className={cn("bg-cover bg-no-repeat flex h-screen overflow-hidden")}
    >
      {loading ? (
        <div className="flex h-screen w-full items-center justify-center">
          <LucideLoaderCircle className="animate-spin h-16 w-16 text-yellow-200" />
        </div>
      ) : (
        <>
          {!user ? (
            <div className="flex h-screen w-full items-center justify-center">
              <LucideLoaderCircle className="animate-spin h-16 w-16 text-yellow-200" />
            </div>
          ) : (
            <>
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto w-full">
                  <RequireSectionAccess>{children}</RequireSectionAccess>
                </main>
              </div>
            </>
          )}
        </>
      )}
      <Toaster
        position="top-right"
        richColors={false}
        closeButton
        duration={4000}
        icons={{
          success: <CheckCircle2 className="h-4 w-4 text-yellow-500" />,
          error: <XCircle className="h-4 w-4 text-red-500" />,
          loading: <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />,
        }}
        toastOptions={{
          classNames: {
            toast:
              "group border border-white/10 bg-zinc-900 text-zinc-50 shadow-lg shadow-black/40",
            title: "text-sm font-medium text-zinc-50",
            description: "text-xs text-zinc-400",
            actionButton: "bg-yellow-500 text-black hover:bg-yellow-400",
            cancelButton: "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
            closeButton:
              "bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700",
            success: "border-yellow-500/30 bg-zinc-900",
            error: "border-red-500/40 bg-zinc-900",
            loading: "border-white/10 bg-zinc-900",
          },
        }}
      />
    </div>
  );
}
