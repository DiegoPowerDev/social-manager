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
    <div className="space-y-12">
      <div className="flex items-center justify-between bg-zinc-950/50 backdrop-blur">
        <div className="p-6  text-white">
          <h1 className="text-2xl font-bold">Youtube</h1>
          <p className=" text-sm">Conecta el canal de YouTube de tu empresa</p>
        </div>
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

      <div className="w-full flex justify-center">
        <Card className="bg-white/70 w-80 ">
          <CardHeader>
            <CardTitle>Conectar canal</CardTitle>
            <CardDescription>
              Inicia sesión con la cuenta de Google dueña del canal. Se
              publicarán videos en ese canal.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
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
    </div>
  );
}
