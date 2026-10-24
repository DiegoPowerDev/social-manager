// components/auth/AiLockedOverlay.tsx
"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

export function AiLockedOverlay({ reason }: { reason?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/85 backdrop-blur-sm p-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-muted">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium flex items-center justify-center gap-1.5">
          <Sparkles className="h-4 w-4" />
          IA no disponible
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {reason || "Tu plan o rol no incluye generación con IA."}
        </p>
      </div>
      <Link
        href="/dashboard/membresia"
        className="inline-flex h-8 items-center justify-center rounded-md border bg-secondary px-3 text-xs font-medium hover:bg-secondary/80"
      >
        Ver planes
      </Link>
    </div>
  );
}
