import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";

export default function HomeHeader() {
  return (
    <header className="sticky top-0 z-50  bg-zinc-950/50 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={"/"} className="flex items-center gap-2">
          <Image
            src="/icono.webp"
            loading="eager"
            width={40}
            height={40}
            alt="logo"
            className="object-contain rounded "
          />
          <div className="font-bold text-white">Trendly Studio</div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white md:flex">
          <a
            href={`${process.env.NODE_ENV === "production" ? "https://trendly.studio/#features" : "http://localhost:3000/#features"}`}
            className="hover:text-yellow-400/90"
          >
            Características
          </a>
          <a href="/plans" className="hover:text-yellow-400/90">
            Planes
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 hover:text-white"
          >
            Iniciar sesión
          </Link>
          <a href="/plans">
            <Button
              size="lg"
              className=" bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white px-2"
            >
              Empezar ahora
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}
