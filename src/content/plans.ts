export type PlanId = "free" | "basic" | "premium";

export interface PlanCard {
  id: PlanId;
  name: string;
  description: string;
  price: string;
  period: string;
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
    price: "$0",
    period: "",
    features: [
      "FB, IG y YouTube",
      "Publicación manual",
      "Sin calendario avanzado", // o quita esta línea si free sí tiene calendario
      "Sin IA",
    ],
    cta: "Empezar gratis",
    paid: false,
    highlighted: false,
  },
  {
    id: "basic",
    name: "Básico",
    description: "Facebook, Instagram, YouTube y calendario.",
    price: "$19",
    period: " / mes",
    features: [
      "FB, IG y YouTube",
      "Calendario y programación",
      "Publicar en masa",
      "Equipo básico",
      "Sin IA",
    ],
    cta: "Contratar Básico",
    paid: true,
    highlighted: false,
  },
  {
    id: "premium",
    name: "Premium",
    description: "Todo el Básico + LinkedIn, TikTok e IA.",
    price: "$39",
    period: " / mes",
    features: [
      "Todo lo del Básico",
      "LinkedIn y TikTok",
      "IA para textos e imágenes",
      "Hasta 100 captions y 30 imágenes IA / mes",
    ],
    cta: "Contratar Premium",
    paid: true,
    highlighted: true,
  },
];
