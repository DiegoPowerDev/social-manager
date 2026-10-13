"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { LucideLoaderCircle } from "lucide-react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { cn } from "cn";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuthStore();

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
                  {children}
                </main>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
