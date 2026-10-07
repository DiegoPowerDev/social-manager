import { NextRequest, NextResponse } from "next/server";
import { generateCaption } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { topic, platform, tone } = await req.json();

    if (!topic || topic.trim().length < 3) {
      return NextResponse.json(
        { error: "Escribe al menos un tema o idea" },
        { status: 400 },
      );
    }

    const caption = await generateCaption({
      topic,
      platform,
      tone,
    });

    return NextResponse.json({ caption });
  } catch (error: any) {
    console.error("Error generando caption:", error);
    return NextResponse.json(
      { error: "Error al generar el texto con IA" },
      { status: 500 },
    );
  }
}
