import { NextRequest, NextResponse } from "next/server";
import { generateCaption } from "@/lib/ai";
import {
  consumeAiCreditAdmin,
  getCompanyAdmin,
  getAiUsageAdmin,
} from "@/lib/tenant-admin"; // o donde tengas las funciones Admin
import { PLAN_LIMITS } from "@/lib/tenant";

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
    const limit = limits.aiCaptionsPerMonth ?? 15;

    if (usage.aiCaptions >= limit) {
      return NextResponse.json(
        {
          error: `Límite de captions alcanzado (${limit}/mes). Mejora tu plan o espera al próximo mes.`,
        },
        { status: 403 },
      );
    }

    const caption = await generateCaption({
      topic,
      platform,
      tone,
      brandInstructions: company.aiInstructions || "",
    });

    await consumeAiCreditAdmin(companyId, "caption");

    const used = usage.aiCaptions + 1;

    return NextResponse.json({
      caption,
      usage: {
        aiCaptions: used,
        aiCaptionsLimit: limit,
        aiImages: usage.aiImages,
        aiImagesLimit: limits.aiImagesPerMonth ?? 3,
      },
    });
  } catch (error: any) {
    console.error("Error generando caption:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar el texto con IA" },
      { status: 500 },
    );
  }
}
