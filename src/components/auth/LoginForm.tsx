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
import { LucideLoaderCircle, Loader2 } from "lucide-react";
import HomeHeader from "@/components/layout/homeHeader";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const { user, loading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Bienvenido");
      router.replace(next.startsWith("/") ? next : "/dashboard");
    } catch {
      toast.error("Correo o contraseña incorrectos");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      router.replace(next.startsWith("/") ? next : "/dashboard");
    }
  }, [user, loading, router, next]);

  return (
    <div
      style={{ backgroundImage: `url("/background.webp")` }}
      className={cn(
        "bg-cover bg-center bg-no-repeat min-h-screen bg-muted/40 px-4 flex flex-col",
      )}
    >
      <HomeHeader />
      <div className="flex-1 flex items-center justify-center py-12">
        {loading ? (
          <LucideLoaderCircle className="animate-spin h-16 w-16 text-orange-400" />
        ) : (
          <Card className="w-full max-w-md shadow-xl border-white/20 bg-white/95">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                TrendlyStudio
              </CardTitle>
              <CardDescription>
                Ingresa a tu cuenta para continuar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="david.c@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-400 to-yellow-500 text-white"
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

                <p className="text-center text-sm text-muted-foreground">
                  <Link href="/" className="underline hover:no-underline">
                    Volver al inicio
                  </Link>
                  {" · "}
                  <Link href="/plans" className="underline hover:no-underline">
                    Ver planes
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
