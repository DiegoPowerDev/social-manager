"use client";

import Link from "next/link";
import { useStorageUsage } from "@/hooks/useStorageUsage";
import { cn } from "@/lib/utils";

export function StorageMeter({ className }: { className?: string }) {
  const { label, pct, nearFull, full } = useStorageUsage();

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between text-xs text-white/70">
        <span>Almacenamiento</span>
        <span
          className={cn(
            full && "text-red-400 font-medium",
            nearFull && !full && "text-amber-300",
          )}
        >
          {label}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            full
              ? "bg-red-500"
              : nearFull
                ? "bg-amber-400"
                : "bg-gradient-to-r from-orange-400 to-yellow-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {full && (
        <p className="text-xs text-red-300">
          Espacio lleno. Elimina archivos o{" "}
          <Link href="/dashboard/membresia" className="underline">
            mejora tu plan
          </Link>
          .
        </p>
      )}
      {nearFull && !full && (
        <p className="text-xs text-amber-200">
          Queda poco espacio. Libera media en la biblioteca si lo necesitas.
        </p>
      )}
    </div>
  );
}
