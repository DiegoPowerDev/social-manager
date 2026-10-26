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
    <div className="space-y-8">
      <div className="bg-zinc-950/50">
        <div className="p-6 text-white">
          <h1 className="text-2xl font-bold">TikTok</h1>
          <p className="text-sm text-white/80">
            Conecta la cuenta de TikTok de tu empresa
          </p>
        </div>
      </div>

      {status && (
        <div
          className={`mx-6 p-3 rounded-md text-sm border ${
            status.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {status.text}
        </div>
      )}

      <div className="flex justify-center px-6 pb-12">
        <Card className="bg-white/70 w-full max-w-sm">
          <CardHeader>
            <CardTitle>Conectar cuenta</CardTitle>
            <CardDescription>
              Autoriza TrendlyStudio en TikTok. Los videos se publican desde la
              cuenta autorizada.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <Button
              className="w-full bg-gradient-to-r from-orange-400 to-yellow-500 text-white"
              disabled={!canConnect || !companyId}
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
