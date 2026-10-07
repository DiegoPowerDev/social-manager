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

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Escribe un tema o idea");
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al generar el caption");
      }

      onGenerate(data.caption);
      setTopic(""); // limpiamos el input después de generar
    } catch (err: any) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
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
          onChange={(e) => setTopic(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label>Tono</Label>
        <Select
          value={tone}
          onValueChange={(v) => setTone(v as any)}
          disabled={loading}
        >
          <SelectTrigger>
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

      <Button
        onClick={handleGenerate}
        disabled={loading || !topic.trim()}
        className="w-full"
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
  );
}
