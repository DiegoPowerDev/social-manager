"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/instagram": "Instagram",
  "/facebook": "Facebook",
  "/linkedin": "LinkedIn",
  "/youtube": "YouTube",
  "/media": "Media Library",
  "/team": "Equipo",
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Social Publisher";

  return (
    <header className="flex h-14 items-center border-b px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
