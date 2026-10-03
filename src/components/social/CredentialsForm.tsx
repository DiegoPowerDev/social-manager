"use client";

import { useState } from "react";
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

interface Props {
  platform: "facebook" | "instagram" | "linkedin" | "youtube";
  onSuccess: () => void;
}

export function CredentialsForm({ platform, onSuccess }: Props) {
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, appId, appSecret }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error al guardar");

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="capitalize">Configurar {platform}</CardTitle>
        <CardDescription>
          Ingresa las credenciales de tu aplicación de {platform} para poder
          conectar cuentas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appId">App ID</Label>
            <Input
              id="appId"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="Ej: 123456789012345"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appSecret">App Secret</Label>
            <Input
              id="appSecret"
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder="••••••••••••••••"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Guardando..." : "Guardar credenciales"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
