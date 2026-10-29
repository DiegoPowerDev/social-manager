"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { LucideLoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RequireSectionAccess } from "@/components/auth/RequireAccess";

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

  if (loading || !user) {
    return (
      <div
        style={{ backgroundImage: `url("/background.webp")` }}
        className={cn(
          "bg-cover bg-no-repeat flex h-screen w-full items-center justify-center",
        )}
      >
        <LucideLoaderCircle className="animate-spin h-16 w-16 text-yellow-200" />
      </div>
    );
  }

  return (
    <div
      style={{ backgroundImage: `url("/background.webp")` }}
      className={cn("bg-cover bg-no-repeat flex h-screen overflow-hidden")}
    >
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden max-w-[1600px]">
        <main className="flex-1 overflow-y-auto w-full">
          <RequireSectionAccess>{children}</RequireSectionAccess>
        </main>
      </div>
    </div>
  );
}
