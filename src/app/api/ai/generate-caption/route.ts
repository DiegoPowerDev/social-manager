import { NextRequest, NextResponse } from "next/server";
import { generateCaption } from "@/lib/ai";
import { consumeAiCredit, getCompany } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const { topic, platform, tone, companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }

    if (!topic || topic.trim().length < 3) {
      return NextResponse.json(
        { error: "Escribe al menos un tema o idea" },
        { status: 400 },
      );
    }

    // Cupo de IA (lanza error si se acabó o el plan no tiene IA)
    try {
      await consumeAiCredit(companyId, "caption");
    } catch (e: any) {
      return NextResponse.json(
        { error: e.message || "Límite de IA alcanzado" },
        { status: 403 },
      );
    }

    const company = await getCompany(companyId);
    const brandInstructions = company?.aiInstructions || "";

    const caption = await generateCaption({
      topic,
      platform,
      tone,
      brandInstructions,
    });

    return NextResponse.json({ caption });
  } catch (error: any) {
    console.error("Error generando caption:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar el texto con IA" },
      { status: 500 },
    );
  }
}
