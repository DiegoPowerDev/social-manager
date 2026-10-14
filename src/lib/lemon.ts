import crypto from "crypto";

export type PlanKey = "basic" | "premium";
export type Interval = "month" | "year";

/** Variant ID de Lemon → plan de Trendly */
export function planFromVariantId(variantId: string | number): {
  plan: PlanKey;
  interval: Interval;
} | null {
  const id = String(variantId);
  const map: Record<string, { plan: PlanKey; interval: Interval }> = {
    [process.env.LEMONSQUEEZY_VARIANT_BASIC_MONTHLY || ""]: {
      plan: "basic",
      interval: "month",
    },
    [process.env.LEMONSQUEEZY_VARIANT_BASIC_YEARLY || ""]: {
      plan: "basic",
      interval: "year",
    },
    [process.env.LEMONSQUEEZY_VARIANT_PREMIUM_MONTHLY || ""]: {
      plan: "premium",
      interval: "month",
    },
    [process.env.LEMONSQUEEZY_VARIANT_PREMIUM_YEARLY || ""]: {
      plan: "premium",
      interval: "year",
    },
  };
  return map[id] || null;
}

export function variantIdFor(plan: PlanKey, interval: Interval): string | null {
  const key =
    plan === "basic"
      ? interval === "month"
        ? process.env.LEMONSQUEEZY_VARIANT_BASIC_MONTHLY
        : process.env.LEMONSQUEEZY_VARIANT_BASIC_YEARLY
      : interval === "month"
        ? process.env.LEMONSQUEEZY_VARIANT_PREMIUM_MONTHLY
        : process.env.LEMONSQUEEZY_VARIANT_PREMIUM_YEARLY;
  return key || null;
}

/** Verifica firma del webhook (header X-Signature) */
export function verifyLemonWebhook(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return digest === signature;
  }
}
