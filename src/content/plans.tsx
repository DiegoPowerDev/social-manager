export type PlanId = "free" | "basic" | "premium";

export interface PlanCard {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  paid: boolean;
}

export const PLAN_CARDS: PlanCard[] = [
  {
    id: "free",
    name: "Free",
    price: "€0",
    period: "/mes",
    description: "Para conocer la plataforma.",
    features: [
      "Facebook, Instagram y YouTube",
      "Acceso limitado de prueba",
      "Sin calendario de publicaciones",
      "Sin IA",
    ],
    cta: "Empezar gratis",
    highlighted: false,
    paid: false,
  },
  {
    id: "basic",
    name: "Básico",
    price: "€19",
    period: "/mes",
    description: "Redes esenciales y calendario.",
    features: [
      "Facebook, Instagram y YouTube",
      "Calendario y programación",
      "Publicación e historial",
      "Equipo (roles)",
      "Sin LinkedIn / TikTok",
      "Sin IA",
    ],
    cta: "Elegir Básico",
    highlighted: false,
    paid: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "€49",
    period: "/mes",
    description: "Todo el stack + IA.",
    features: [
      "Todo lo del Básico",
      "LinkedIn y TikTok",
      "Publicación en masa",
      "IA: captions e imágenes",
      "Cupos IA ampliados",
      "Prioridad de soporte",
    ],
    cta: "Elegir Premium",
    highlighted: true,
    paid: true,
  },
];
