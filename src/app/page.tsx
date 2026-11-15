import Link from "next/link";
import { PricingSection } from "@/components/marketing/PricingSection";
import { cn } from "cn";
import HomeHeader from "@/components/layout/homeHeader";
import HomeFooter from "@/components/layout/homeFooter";
import { TrendingUpIcon } from "lucide-react";

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

export default function HomePage() {
  return (
    <main
      style={{ backgroundImage: `url("/home-background.webp")` }}
      className={cn("bg-cover bg-no-repeat min-h-screen ")}
    >
      <HomeHeader />

      {/* Banner / Hero */}
      <section className="relative overflow-hidden ">
        {/* Espacio para banner: sustituye el div por <Image src="/banner.jpg" ... /> */}
        <div className="absolute inset-0 bg-linear-to-tr from-zinc-950/50  via-zinc-950/50 via-50% to-black" />
        <div className="w-full grid grid-cols-1 md:grid-cols-3 mx-auto max-w-6xl">
          <div className="col-span-2 relative  pl-4 py-20 sm:pl-6 sm:py-28">
            <p className="mb-3 text-xl pl-2 font-bold text-yellow-500">
              Publicación multi-red para equipos
            </p>
            <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Crea, Programa y Publica en todas tus redes desde un solo lugar
            </h1>
            <div className="w-full py-4 flex items-center justify-center">
              <img
                className="w-full border rounded-xl overflow-hidden"
                src="/background.webp"
                alt="background"
              />
            </div>
            <p className="mt-5 max-w-xl text-lg text-zinc-300">
              TrendlyStudio conecta Facebook, Instagram, LinkedIn y YouTube.
              Calendario, publicación en masa e IA para captions e imágenes con
              roles para tu equipo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-xl text-white hover:-translate-y-1  duration-100 bg-linear-to-r from-orange-400 to-yellow-500 px-6 py-3 text-sm font-semibold flex items-center justify-center gap-4"
              >
                Vuelvete Tendencia Ahora
                <TrendingUpIcon />
              </Link>
            </div>
          </div>
          <div className="relative w-full h-full hidden md:flex items-center justify-center">
            <img
              className="w-full border rounded-xl overflow-hidden"
              src="/background.webp"
              alt="background"
            />
          </div>
        </div>
      </section>

      {/* Características */}

      <section
        id="features"
        className="px-4 py-16 sm:px-6   bg-zinc-950/50 text-white "
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-yellow-400">
              Todo lo que necesitas para publicar con ritmo
            </h2>
            <p className="mt-3 text-white">
              Diseñado para agencias y empresas que no quieren saltar entre
              cinco apps distintas.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl  border border-white/10 bg-zinc-950/70 p-6 hover:-translate-y-2 duration-100"
              >
                <div className="mb-3 h-1.5 w-8 rounded-full bg-yellow-500" />
                <h3 className="font-semibold text-yellow-400">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planes */}
      <PricingSection />

      {/* CTA final */}
      <section className="px-4 py-16 sm:px-6 bg-zinc-950/50 text-white">
        <div className="rounded-2xl px-8 py-12 text-center space-y-6">
          <h2 className="text-2xl text-yellow-400 font-bold">
            ¿Listo para ordenar tus redes?
          </h2>
          <p className="mx-auto max-w-md text-white pb-8">
            Entra con tu cuenta y conecta Facebook, Instagram, LinkedIn o
            YouTube en minutos.
          </p>
          <Link
            href="/login"
            className="rounded-xl font-bold p-4 bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white"
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
