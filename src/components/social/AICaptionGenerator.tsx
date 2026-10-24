"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAiUsage } from "@/app/hooks/useAiUsage";
import { canUseAi } from "@/content/access";
import { AiLockedOverlay } from "@/components/auth/AiLockedOverlay";
import { cn } from "@/lib/utils";

interface Props {
  platform?: "facebook" | "instagram" | "general";
  onGenerate: (caption: string) => void;
}

export function AICaptionGenerator({
  platform = "general",
  onGenerate,
}: Props) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("profesional y cercano");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { captionsLeft, captionsUsed, captionsLimit, setFromApi } =
    useAiUsage();
  const companyId = useAuthStore((s) => s.companyId);
  const memberRole = useAuthStore((s) => s.memberRole);
  const aiEnabledPlan = useAuthStore((s) => s.aiEnabled);

  const { allowed, reason } = canUseAi({
    role: memberRole,
    aiEnabled: aiEnabledPlan !== false,
  });

  const handleGenerate = async () => {
    if (!allowed) return;
    if (!topic.trim()) {
      setError("Escribe un tema o idea");
      return;
    }
    if (!companyId) {
      setError("No hay empresa asociada");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform,
          tone,
          companyId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al generar el caption");
      }

      onGenerate(data.caption);
      if (data.usage) {
        setFromApi({
          aiCaptions: data.usage.aiCaptions,
          aiImages: data.usage.aiImages,
        });
      }
      setTopic("");
    } catch (err: any) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative space-y-3 p-4 flex flex-col w-full">
      {!allowed && <AiLockedOverlay reason={reason} />}

      <div
        className={cn(
          "space-y-3",
          !allowed && "pointer-events-none select-none opacity-40",
        )}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Generar caption con IA
        </div>

        <div className="space-y-2">
          <Label htmlFor="topic">Tema o idea</Label>
          <Input
            id="topic"
            placeholder="Ej: Lanzamiento de nuevo producto, tips de productividad..."
            value={topic}
            className="bg-white text-black"
            onChange={(e) => setTopic(e.target.value)}
            disabled={loading || !allowed}
          />
        </div>

        <div className="space-y-2">
          <Label>Tono</Label>
          <Select
            value={tone}
            onValueChange={(v) => setTone(v as any)}
            disabled={loading || !allowed}
          >
            <SelectTrigger className="bg-white text-black">
              <SelectValue placeholder="Selecciona un tono" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profesional y cercano">
                Profesional y cercano
              </SelectItem>
              <SelectItem value="divertido y desenfadado">
                Divertido y desenfadado
              </SelectItem>
              <SelectItem value="inspirador">Inspirador</SelectItem>
              <SelectItem value="urgente y persuasivo">
                Urgente y persuasivo
              </SelectItem>
              <SelectItem value="educativo">Educativo</SelectItem>
              <SelectItem value="emocional">Emocional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <p className="text-xs text-white/60 text-center">
          {aiEnabledPlan
            ? `${captionsLeft} captions restantes este mes (${captionsUsed}/${captionsLimit})`
            : "Tu plan no incluye IA"}
        </p>
        <Button
          onClick={handleGenerate}
          disabled={
            loading ||
            !allowed ||
            !topic.trim() ||
            captionsLeft <= 0 ||
            !companyId
          }
          className="w-full bg-gradient-to-r from-orange-400 to-yellow-500 h-10 text-white"
          variant="secondary"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generar caption
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
