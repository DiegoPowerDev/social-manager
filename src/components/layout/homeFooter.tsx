import Link from "next/link";

export default function HomeFooter() {
  return (
    <footer className="bg-black text-white py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-semibold">TrendlyStudio</p>
          <p className="mt-1 text-sm text-zinc-300">
            Publicación y programación para equipos de marketing.
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Operado por{" "}
            <span className="text-zinc-200">TORRES PACHERRES DIEGO ARTURO</span>
          </p>
        </div>
        <div className="flex flex-col flex-wrap gap-4 text-sm text-zinc-400">
          <Link href="/privacy" className="hover:text-white">
            Política de privacidad
          </Link>
          <Link href="/terms" className="hover:text-white">
            Términos del servicio
          </Link>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-4 text-center text-xs text-zinc-400 sm:px-6">
        © {new Date().getFullYear()} TORRES PACHERRES DIEGO ARTURO ·
        TrendlyStudio. Facebook, Instagram, LinkedIn y YouTube son marcas de sus
        respectivos propietarios.
      </p>
    </footer>
  );
}
