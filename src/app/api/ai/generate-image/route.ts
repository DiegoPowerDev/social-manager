import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai";
import {
  consumeAiCreditAdmin,
  getCompanyAdmin,
  getAiUsageAdmin,
} from "@/lib/tenant-admin";
import { PLAN_LIMITS } from "@/lib/tenant";

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

    const company = await getCompanyAdmin(companyId);
    if (!company) {
      return NextResponse.json(
        { error: "Empresa no encontrada" },
        { status: 404 },
      );
    }

    if (company.features?.aiEnabled === false) {
      return NextResponse.json(
        { error: "Tu plan no incluye IA" },
        { status: 403 },
      );
    }

    const limits = company.limits || PLAN_LIMITS.free;
    const usage = await getAiUsageAdmin(companyId);
    const imagesLimit = limits.aiImagesPerMonth ?? 3;
    const captionsLimit = limits.aiCaptionsPerMonth ?? 15;

    if (usage.aiImages >= imagesLimit) {
      return NextResponse.json(
        {
          error: `Límite de imágenes IA alcanzado (${imagesLimit}/mes). Mejora tu plan o espera al próximo mes.`,
        },
        { status: 403 },
      );
    }

    const brandInstructions = company.aiInstructions || "";
    const finalPrompt = brandInstructions
      ? `${prompt.trim()}\n\nBrand / style notes: ${brandInstructions}`
      : prompt.trim();

    const generatedImageUrl = await generateImage({
      prompt: finalPrompt,
      imageUrl, // opcional (edición)
    });

    // Solo si la generación salió bien
    await consumeAiCreditAdmin(companyId, "image");

    return NextResponse.json({
      imageUrl: generatedImageUrl,
      usage: {
        aiCaptions: usage.aiCaptions,
        aiCaptionsLimit: captionsLimit,
        aiImages: usage.aiImages + 1,
        aiImagesLimit: imagesLimit,
      },
    });
  } catch (error: any) {
    console.error("Error generando imagen:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar la imagen" },
      { status: 500 },
    );
  }
}
