"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function LinkedInConnectFlow({
  companyId,
  canConnect,
  status,
}: {
  companyId: string;
  canConnect: boolean;
  status: { type: "success" | "error"; text: string } | null;
}) {
  return (
    <div className="flex-1 flex flex-col space-y-6 p-6 max-w-lg">
      <div>
        <h2 className="text-2xl font-bold">LinkedIn</h2>
        <p className="text-muted-foreground mt-1">
          Conecta el perfil de LinkedIn desde el que publicarás
        </p>
      </div>

      {status && (
        <div
          className={`p-3 rounded-md text-sm border ${
            status.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {status.text}
        </div>
      )}

      <Card className="bg-white/70">
        <CardHeader>
          <CardTitle>Conectar perfil</CardTitle>
          <CardDescription>
            Se publicará como el perfil personal autorizado (OpenID +
            w_member_social).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            disabled={!canConnect}
            onClick={() => {
              window.location.href = `/api/auth/linkedin?companyId=${companyId}`;
            }}
          >
            Conectar LinkedIn
          </Button>
          {!canConnect && (
            <p className="text-xs text-muted-foreground mt-2">
              Solo un administrador puede conectar redes
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
