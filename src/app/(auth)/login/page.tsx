"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { cn } from "cn";
import { useAuthStore } from "@/stores/useAuthStore";
import { LucideLoaderCircle } from "lucide-react";
import HomeHeader from "@/components/layout/homeHeader";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingProcess, setLoadingProcess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProcess(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError("Correo o contraseña incorrectos");
    } finally {
      setLoadingProcess(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  return (
    <div
      style={{ backgroundImage: `url("/background.webp")` }}
      className={cn(
        "bg-cover h-screen bg-no-repeat min-h-screen bg-muted/40 px-4 flex flex-col",
      )}
    >
      <HomeHeader />
      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <div className="flex h-screen w-full items-center justify-center">
            <LucideLoaderCircle className="animate-spin h-16 w-16 text-orange-400" />
          </div>
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                Social Publisher
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
                    placeholder="david.c@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loadingProcess ? "Ingresando..." : "Ingresar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
