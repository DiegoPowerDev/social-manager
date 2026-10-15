import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PricingSection } from "@/components/marketing/PricingSection";
import { cn } from "cn";
import HomeHeader from "@/components/layout/homeHeader";
import HomeFooter from "@/components/layout/homeFooter";

const features = [
  {
    title: "Todas tus redes en un solo lugar",
    description:
      "Publica en Facebook, Instagram, LinkedIn y YouTube sin cambiar de herramienta.",
  },
  {
    title: "Calendario y programación",
    description:
      "Planifica el mes, edita posts programados y deja que se publiquen solos.",
  },
  {
    title: "Publicación en masa",
    description:
      "Un mismo contenido a varias redes a la vez, con vista previa por plataforma.",
  },
  {
    title: "IA para captions e imágenes",
    description:
      "Genera textos e imágenes con cupos según tu plan, adaptados a tu marca.",
  },
  {
    title: "Equipo y roles",
    description:
      "Invita editores y viewers. Controla quién publica y quién solo consulta.",
  },
  {
    title: "Historial y dashboard",
    description:
      "Revisa lo publicado, enlaces a cada post y actividad de tu equipo.",
  },
];

const plans = [
  {
    name: "Free",
    price: "€0",
    period: "/mes",
    description: "Para probar el flujo con tu equipo.",
    features: [
      "1 empresa",
      "Redes principales",
      "15 captions IA / mes",
      "3 imágenes IA / mes",
      "Calendario básico",
    ],
    cta: "Empezar",
    highlighted: false,
  },
  {
    name: "Monthly",
    price: "€29",
    period: "/mes",
    description: "Para equipos que publican cada semana.",
    features: [
      "Todo lo de Free",
      "100 captions IA / mes",
      "30 imágenes IA / mes",
      "Publicación en masa",
      "Más asientos de equipo",
    ],
    cta: "Elegir Monthly",
    highlighted: true,
  },
  {
    name: "Yearly",
    price: "€249",
    period: "/año",
    description: "Mejor precio si ya lo usas en serio.",
    features: [
      "Todo lo de Monthly",
      "150 captions IA / mes",
      "50 imágenes IA / mes",
      "Prioridad de soporte",
      "2 meses de ahorro vs mensual",
    ],
    cta: "Elegir Yearly",
    highlighted: false,
  },
];

export default function HomePage() {
  return (
    <main
      style={{ backgroundImage: `url("/home-background.webp")` }}
      className={cn("bg-cover bg-no-repeat min-h-screen ")}
    >
      <HomeHeader />

      {/* Banner / Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* Espacio para banner: sustituye el div por <Image src="/banner.jpg" ... /> */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-zinc-950 to-zinc-950" />
        <div className="absolute inset-0 bg-[url('/banner.jpg')] bg-cover bg-center opacity-30" />
        {/* Si no tienes banner.jpg, el gradient se ve igual; añade public/banner.jpg cuando quieras */}

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="mb-3 text-sm font-medium text-yellow-500">
            Publicación multi-red para equipos
          </p>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Crea, programa y publica en todas tus redes desde un solo lugar
          </h1>
          <p className="mt-5 max-w-xl text-lg text-zinc-300">
            TrendlyStudio conecta Facebook, Instagram, LinkedIn y YouTube.
            Calendario, publicación en masa e IA para captions e imágenes — con
            roles para tu equipo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-yellow-500 px-6 py-3 text-sm font-semibold text-black hover:bg-yellow-400"
            >
              Empezar ahora
            </Link>
            <a
              href="#features"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-zinc-200 hover:bg-white/5"
            >
              Ver características
            </a>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Al conectar YouTube u otras redes solo usamos los permisos que
            autorizas. Tú decides qué se publica.
          </p>
        </div>
      </section>

      {/* Características */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight">
            Todo lo que necesitas para publicar con ritmo
          </h2>
          <p className="mt-3 text-zinc-400">
            Diseñado para agencias y empresas que no quieren saltar entre cinco
            apps distintas.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="mb-3 h-1.5 w-8 rounded-full bg-yellow-500" />
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Planes */}
      <PricingSection variant="light" />

      {/* CTA final */}
      <section className="px-4 py-16 sm:px-6   bg-black/50 text-white ">
        <div className="rounded-2xl borderpx-8 py-12 text-center space-y-6">
          <h2 className="text-2xl font-bold">¿Listo para ordenar tus redes?</h2>
          <p className="mx-auto max-w-md text-zinc-400">
            Entra con tu cuenta y conecta Facebook, Instagram, LinkedIn o
            YouTube en minutos.
          </p>
          <Link
            href="/login"
            className="rounded-xl p-4 mt-2 bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white"
          >
            Comenzar
          </Link>
        </div>
      </section>

      {/* Footer */}
      <HomeFooter />
    </main>
  );
}
