export type PlanId = "free" | "basic" | "premium";

export interface PlanCard {
  id: PlanId;
  name: string;
  description: string;
  /** Precio mostrado mensualmente */
  priceMonthly: string;
  /** Precio mostrado en facturación anual (total del año o equivalente; el que quieras mostrar) */
  priceYearly: string;
  /** Sufijo bajo el precio mensual, ej. " / mes" */
  periodMonthly: string;
  periodYearly: string;
  features: string[];
  cta: string;
  paid: boolean;
  highlighted: boolean;
}

export const PLAN_CARDS: PlanCard[] = [
  {
    id: "free",
    name: "Gratis",
    description: "Para probar el panel con límites básicos.",
    priceMonthly: "$0",
    priceYearly: "$0",
    periodMonthly: "",
    periodYearly: "",
    features: ["FB, IG y YouTube", "Publicación manual limitada", "Sin IA"],
    cta: "Empezar gratis",
    paid: false,
    highlighted: false,
  },
  {
    id: "basic",
    name: "Básico",
    description: "Facebook, Instagram, YouTube y calendario.",
    priceMonthly: "$19",
    priceYearly: "$190", // ej. ~2 meses gratis
    periodMonthly: " / mes",
    periodYearly: " / año",
    features: [
      "FB, IG y YouTube",
      "Calendario y programación",
      "Publicar en masa",
      "Equipo básico",
    ],
    cta: "Contratar Básico",
    paid: true,
    highlighted: false,
  },
  {
    id: "premium",
    name: "Premium",
    description: "Todo el Básico + LinkedIn, TikTok e IA.",
    priceMonthly: "$39",
    priceYearly: "$390",
    periodMonthly: " / mes",
    periodYearly: " / año",
    features: [
      "Todo lo del Básico",
      "LinkedIn y TikTok",
      "IA textos e imágenes",
      "Límites de IA ampliados",
    ],
    cta: "Contratar Premium",
    paid: true,
    highlighted: true,
  },
];
