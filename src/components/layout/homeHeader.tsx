"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { useAuthStore } from "@/stores/useAuthStore";

export default function HomeHeader() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);

  const featuresUrl =
    process.env.NODE_ENV === "production"
      ? "https://trendly.studio/#features"
      : "http://localhost:3000/#features";

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/50 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/icono.webp"
            loading="eager"
            width={40}
            height={40}
            alt="logo"
            className="object-contain rounded"
          />
          <div className="font-bold text-white text-lg">
            Trendly<span className="text-xl text-yellow-400">Studio</span>
          </div>
        </Link>

        {/* Navegación Desktop */}
        <nav className="hidden font-bold items-center gap-6 text-sm text-white md:flex">
          <a href={featuresUrl} className="hover:text-yellow-400/90">
            Características
          </a>
          <Link href="/plans" className="hover:text-yellow-400/90">
            Planes
          </Link>
        </nav>

        {/* Botones derecha + Hamburguesa */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop auth + CTA */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-sm text-white font-bold hover:text-white"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm text-white font-bold hover:text-white"
              >
                Iniciar sesión
              </Link>
            )}

            <Link href="/plans">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white px-4"
              >
                Empezar ahora
              </Button>
            </Link>
          </div>

          {/* Botón Hamburguesa (solo móvil) */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10 focus:outline-none">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Abrir menú</span>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-[280px] sm:w-[320px] bg-zinc-950 border-zinc-800 text-white"
            >
              <SheetHeader className="mb-6">
                <SheetTitle className="text-left text-white flex items-center">
                  <Image
                    src="/icono.webp"
                    width={32}
                    height={32}
                    alt="logo"
                    className="rounded mx-1"
                  />
                  Trendly<span className="text-yellow-400">Studio</span>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1">
                <a
                  href={featuresUrl}
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 text-base font-medium rounded-lg hover:bg-white/10 transition-colors"
                >
                  Características
                </a>

                <Link
                  href="/plans"
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 text-base font-medium rounded-lg hover:bg-white/10 transition-colors"
                >
                  Planes
                </Link>

                <div className="border-t border-zinc-700" />

                {user ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="px-4 py-3 text-base font-medium rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="px-4 py-3 text-base font-medium rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                )}

                <Link
                  href="/plans"
                  onClick={() => setOpen(false)}
                  className="mt-2"
                >
                  <Button className=" mx-4 bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-500 text-white">
                    Empezar ahora
                  </Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
