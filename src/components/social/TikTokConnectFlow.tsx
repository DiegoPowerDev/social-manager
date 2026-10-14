"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function TikTokConnectFlow({
  companyId,
  canConnect,
  status,
}: {
  companyId: string;
  canConnect: boolean;
  status: { type: "success" | "error"; text: string } | null;
}) {
  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between bg-zinc-950/50 backdrop-blur">
        <div className="p-6 text-white">
          <h1 className="text-2xl font-bold">TikTok</h1>
          <p className="text-sm">Conecta la cuenta de TikTok de tu empresa</p>
        </div>
      </div>

      {status && (
        <div
          className={`mx-6 p-3 rounded-md text-sm ${
            status.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {status.text}
        </div>
      )}

      <div className="w-full flex justify-center">
        <Card className="bg-white/70 w-80">
          <CardHeader>
            <CardTitle>Conectar cuenta</CardTitle>
            <CardDescription>
              Autoriza TrendlyStudio en TikTok. En sandbox, la cuenta debe estar
              en Target users y en modo privado para publicar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex flex-col items-center">
            <Button
              disabled={!canConnect}
              onClick={() => {
                window.location.href = `/api/auth/tiktok?companyId=${companyId}`;
              }}
            >
              Conectar TikTok
            </Button>
            {!canConnect && (
              <p className="text-xs text-muted-foreground text-center">
                Solo un administrador puede conectar redes
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
