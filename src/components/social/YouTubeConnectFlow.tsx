"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function YouTubeConnectFlow({
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
        <h2 className="text-2xl font-bold">YouTube</h2>
        <p className="text-muted-foreground mt-1">
          Conecta el canal de YouTube de tu empresa
        </p>
      </div>

      {status && (
        <div
          className={`p-3 rounded-md text-sm ${
            status.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {status.text}
        </div>
      )}

      <Card className="bg-white/70">
        <CardHeader>
          <CardTitle>Conectar canal</CardTitle>
          <CardDescription>
            Inicia sesión con la cuenta de Google dueña del canal. Se publicarán
            videos en ese canal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            disabled={!canConnect}
            onClick={() => {
              window.location.href = `/api/auth/youtube?companyId=${companyId}`;
            }}
          >
            Conectar YouTube
          </Button>
          {!canConnect && (
            <p className="text-xs text-muted-foreground">
              Solo un administrador puede conectar redes
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
