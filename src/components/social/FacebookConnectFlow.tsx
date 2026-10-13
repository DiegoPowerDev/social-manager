"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function FacebookConnectFlow({
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
          <h1 className="text-2xl font-bold">Facebook</h1>
          <p className=" text-sm">
            Conecta la Página de Facebook de tu empresa
          </p>
        </div>
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
      <div className="w-full flex justify-center items-center">
        <Card className="bg-white/70 w-80 ">
          <CardHeader>
            <CardTitle>Conectar página</CardTitle>
            <CardDescription>
              Usa una cuenta con rol de administrador en la Página.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              disabled={!canConnect}
              onClick={() => {
                window.location.href = `/api/auth/facebook?companyId=${companyId}`;
              }}
            >
              Conectar Facebook
            </Button>
            {!canConnect && (
              <p className="text-xs text-muted-foreground mt-2">
                Solo un administrador puede conectar redes
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
