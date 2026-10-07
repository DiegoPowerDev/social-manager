import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageUrl } = await req.json();

    if (!prompt || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: "Escribe un prompt descriptivo" },
        { status: 400 },
      );
    }

    const generatedImageUrl = await generateImage({
      prompt,
      imageUrl, // opcional
    });

    return NextResponse.json({ imageUrl: generatedImageUrl });
  } catch (error: any) {
    console.error("Error generando imagen:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar la imagen" },
      { status: 500 },
    );
  }
}
