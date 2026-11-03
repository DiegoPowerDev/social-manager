import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai";
import {
  consumeAiCreditAdmin,
  getCompanyAdmin,
  getAiUsageAdmin,
} from "@/lib/tenant-admin";
import {
  getEffectivePlanFromCompany,
  requireCompanyMember,
  jsonError,
} from "@/lib/ai-route-helpers";

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageUrl, imageUrls, companyId, aspectRatio } =
      await req.json();

    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: "Escribe un prompt descriptivo" },
        { status: 400 },
      );
    }

    await requireCompanyMember(req, companyId);

    const company = await getCompanyAdmin(companyId);
    if (!company) {
      return NextResponse.json(
        { error: "Empresa no encontrada" },
        { status: 404 },
      );
    }

    const effective = getEffectivePlanFromCompany(company);

    console.log("AI effective plan", {
      companyId,
      billingPlan: company.plan,
      courtesy: company.courtesy,
      partner: company.partner,
      effective,
    });

    if (!effective.aiEnabled) {
      return NextResponse.json(
        { error: "Tu plan no incluye IA" },
        { status: 403 },
      );
    }

    const imagesLimit = effective.limits.aiImagesPerMonth;
    const captionsLimit = effective.limits.aiCaptionsPerMonth;
    const usage = await getAiUsageAdmin(companyId);

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

    const refs: string[] = Array.isArray(imageUrls)
      ? imageUrls.filter(
          (u: unknown) => typeof u === "string" && (u as string).length > 0,
        )
      : typeof imageUrl === "string" && imageUrl
        ? [imageUrl]
        : [];

    const generatedImageUrl = await generateImage({
      prompt: finalPrompt,
      imageUrl: refs[0],
      imageUrls: refs,
      aspectRatio: typeof aspectRatio === "string" ? aspectRatio : "1:1",
    });

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
    const { status, body } = jsonError(error);
    return NextResponse.json(body, { status });
  }
}
