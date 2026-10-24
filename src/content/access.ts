export type PlanId = "free" | "basic" | "premium";
export type MemberRole = "admin" | "editor" | "viewer";

export type AccessRule = {
  plans?: PlanId[]; // si no hay → cualquier plan
  roles: MemberRole[];
};

export const SECTION_ACCESS: Record<string, AccessRule> = {
  dashboard: { roles: ["admin", "editor", "viewer"] },
  calendar: {
    plans: ["basic", "premium"],
    roles: ["admin", "editor", "viewer"],
  },
  instagram: {
    plans: ["basic", "premium"],
    roles: ["admin", "editor"],
  },
  facebook: {
    plans: ["basic", "premium"],
    roles: ["admin", "editor"],
  },
  youtube: {
    plans: ["basic", "premium"],
    roles: ["admin", "editor"],
  },
  publish: {
    plans: ["basic", "premium"],
    roles: ["admin", "editor"],
  },
  media: {
    plans: ["basic", "premium"],
    roles: ["admin", "editor"],
  },
  linkedin: {
    plans: ["premium"],
    roles: ["admin", "editor"],
  },
  tiktok: {
    plans: ["premium"],
    roles: ["admin", "editor"],
  },
  settings: {
    roles: ["admin", "editor"],
  },
  team: {
    roles: ["admin"],
  },
  membresia: {
    roles: ["admin"],
  },
  admin: {
    roles: ["admin", "editor", "viewer"], // el layout exige isSuperAdmin
  },
};

export function sectionKeyFromHref(href: string): string {
  const parts = href.split("/").filter(Boolean);
  if (parts[0] !== "dashboard") return parts[0] || "";
  return parts[1] || "";
}

export function getRuleForHref(href: string): AccessRule | null {
  return SECTION_ACCESS[sectionKeyFromHref(href)] ?? null;
}

export function canAccessSection(
  href: string,
  opts: {
    plan?: string | null;
    role?: string | null;
    isSuperAdmin?: boolean;
  },
): { visible: boolean; locked: boolean } {
  const key = sectionKeyFromHref(href);

  if (key === "admin") {
    return {
      visible: !!opts.isSuperAdmin,
      locked: false,
    };
  }

  const rule = SECTION_ACCESS[key];
  if (!rule) {
    return { visible: true, locked: false };
  }

  const role = (opts.role as MemberRole) || "viewer";
  const plan = (opts.plan as PlanId) || "free";

  if (!rule.roles.includes(role)) {
    return { visible: false, locked: false }; // no mostrar
  }

  const planOk = !rule.plans || rule.plans.includes(plan);
  return {
    visible: true,
    locked: !planOk, // se ve pero con candado → membresía
  };
}

const planRank: Record<PlanId, number> = { free: 0, basic: 1, premium: 2 };
export function planAtLeast(current: string | null | undefined, min: PlanId) {
  return (planRank[(current as PlanId) || "free"] ?? 0) >= planRank[min];
}

export const AI_ACCESS = {
  roles: ["admin", "editor"] as MemberRole[],
  plans: ["premium"] as PlanId[], // o ["basic","premium"] si basic tiene algo de IA
};

export function canUseAi(opts: { role?: string | null; aiEnabled?: boolean }): {
  allowed: boolean;
  reason?: string;
} {
  const role = (opts.role as MemberRole) || "viewer";

  if (!["admin", "editor"].includes(role)) {
    return { allowed: false, reason: "Tu rol no puede usar IA" };
  }
  if (opts.aiEnabled === false) {
    return {
      allowed: false,
      reason: "Tu plan no incluye generación con IA. Mejora a Premium.",
    };
  }
  return { allowed: true };
}
