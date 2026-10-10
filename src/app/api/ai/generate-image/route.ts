import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai";
import { consumeAiCredit, getCompany } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageUrl, companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }

    if (!prompt || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: "Escribe un prompt descriptivo" },
        { status: 400 },
      );
    }

    try {
      await consumeAiCredit(companyId, "image");
    } catch (e: any) {
      return NextResponse.json(
        { error: e.message || "Límite de IA alcanzado" },
        { status: 403 },
      );
    }

    const company = await getCompany(companyId);
    const brandInstructions = company?.aiInstructions || "";

    const finalPrompt = brandInstructions
      ? `${prompt}\n\nBrand / style notes: ${brandInstructions}`
      : prompt;

    const generatedImageUrl = await generateImage({
      prompt: finalPrompt,
      imageUrl,
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
