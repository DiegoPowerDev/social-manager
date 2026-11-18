"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { LucideLoaderCircle, Loader2, Mail, Lock } from "lucide-react";
import HomeHeader from "@/components/layout/homeHeader";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  const { user, loading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Ya logueado → salir del login
  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [user, loading, router, next]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Bienvenido");
      // La redirección la hace el useEffect cuando user + loading estén listos
    } catch {
      toast.error("Correo o contraseña incorrectos");
      setSubmitting(false);
    }
  };

  // Si el login funcionó, mantener "Ingresando..." hasta que loading sea false y haya user
  useEffect(() => {
    if (submitting && !loading && user) {
      setSubmitting(false);
    }
    if (submitting && !loading && !user) {
      // falló applyTenant / sin users doc
      setSubmitting(false);
    }
  }, [submitting, loading, user]);

  if (loading || user) {
    return (
      <div className="relative isolate min-h-screen flex items-center justify-center">
        <div
          aria-hidden="true"
          style={{ backgroundImage: `url("/background.webp")` }}
          className="fixed md:absolute inset-0 -z-10 bg-cover bg-no-repeat bg-[position:40%_60%] md:bg-center"
        />
        <div
          aria-hidden="true"
          className="fixed md:absolute inset-0 -z-10 bg-zinc-950/40"
        />
        <LucideLoaderCircle className="animate-spin h-16 w-16 text-orange-400" />
      </div>
    );
  }

  return (
    <div className={cn("relative isolate min-h-screen flex flex-col")}>
      {/* Fondo fijo */}
      <div
        aria-hidden="true"
        style={{ backgroundImage: `url("/background.webp")` }}
        className="fixed md:absolute inset-0 -z-10 bg-cover bg-no-repeat bg-[position:40%_60%] md:bg-center"
      />
      <div
        aria-hidden="true"
        className="fixed md:absolute inset-0 -z-10 bg-gradient-to-tr from-zinc-950/60 via-zinc-950/40 to-black/70"
      />
      <HomeHeader />
      <div className="flex-1 flex  px-4  items-center justify-center py-12">
        <Card className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/70 text-white shadow-2xl shadow-black/40 backdrop-blur-xl">
          <CardHeader className="space-y-2 pb-2">
            <div className="h-1.5 w-8 rounded-full bg-yellow-500" />
            <CardTitle className="text-3xl font-bold tracking-tight text-white">
              TrendlyStudio
            </CardTitle>
            <CardDescription className="text-zinc-300">
              Ingresa a tu cuenta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-200">
                  Correo electrónico
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="david.c@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                    className="h-11 rounded-xl border-white/15 bg-white/5 pl-10 text-white placeholder:text-zinc-500 focus-visible:border-yellow-500 focus-visible:ring-yellow-500/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-200">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={submitting}
                    className="h-11 rounded-xl border-white/15 bg-white/5 pl-10 text-white placeholder:text-zinc-500 focus-visible:border-yellow-500 focus-visible:ring-yellow-500/30"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-gradient-to-r from-orange-400 to-yellow-500 font-semibold text-white duration-100 hover:-translate-y-0.5 hover:from-orange-500 hover:to-yellow-500"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  "Ingresar"
                )}
              </Button>

              <p className="text-center text-sm text-zinc-400">
                <Link
                  href="/"
                  className="underline underline-offset-4 hover:text-yellow-400"
                >
                  Volver al inicio
                </Link>
                {" · "}
                <Link
                  href="/plans"
                  className="underline underline-offset-4 hover:text-yellow-400"
                >
                  Ver planes
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
