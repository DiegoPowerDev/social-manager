const isLive = process.env.PAYPAL_MODE === "live";

export function paypalBase() {
  return isLive
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error("Faltan PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET");
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal auth failed: ${t}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

export type PlanKey =
  | "basic_monthly"
  | "basic_yearly"
  | "premium_monthly"
  | "premium_yearly";

export function getPlanId(key: PlanKey): string | undefined {
  const map: Record<PlanKey, string | undefined> = {
    basic_monthly: process.env.PAYPAL_PLAN_BASIC_MONTHLY,
    basic_yearly: process.env.PAYPAL_PLAN_BASIC_YEARLY,
    premium_monthly: process.env.PAYPAL_PLAN_PREMIUM_MONTHLY,
    premium_yearly: process.env.PAYPAL_PLAN_PREMIUM_YEARLY,
  };
  return map[key];
}
