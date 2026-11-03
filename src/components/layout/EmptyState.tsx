"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Link opcional en lugar de onClick */
  actionHref?: string;
  className?: string;
  children?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
  children,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-white/20 bg-white/70 px-6 py-12",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 rounded-full bg-yellow-400 p-3">
          <Icon className="h-8 w-8 text-black" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-white">{description}</p>
      )}
      {children}
      {(actionLabel && onAction) || (actionLabel && actionHref) ? (
        <div className="mt-6">
          {actionHref ? (
            <Button
              className="bg-gradient-to-r from-orange-400 to-yellow-500 text-white"
              render={<Link href={actionHref}>{actionLabel}</Link>}
              nativeButton={false}
            >
              <a></a>
            </Button>
          ) : (
            <Button
              onClick={onAction}
              className="bg-gradient-to-r from-orange-400 to-yellow-500 text-white"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
