import { NextRequest, NextResponse } from "next/server";
import { generateCaption, type CaptionLength } from "@/lib/ai";
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
    const {
      topic,
      platform,
      tone,
      companyId,
      language,
      length,
      includeHashtags,
      includeEmojis,
    } = await req.json();

    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }
    if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
      return NextResponse.json(
        { error: "Escribe al menos un tema o idea" },
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
    if (!effective.aiEnabled) {
      return NextResponse.json(
        { error: "Tu plan no incluye IA" },
        { status: 403 },
      );
    }

    const limit = effective.limits.aiCaptionsPerMonth;
    const imagesLimit = effective.limits.aiImagesPerMonth;
    const usage = await getAiUsageAdmin(companyId);

    if (usage.aiCaptions >= limit) {
      return NextResponse.json(
        {
          error: `Límite de captions alcanzado (${limit}/mes). Mejora tu plan o espera al próximo mes.`,
        },
        { status: 403 },
      );
    }

    const safePlatform =
      platform === "facebook" || platform === "instagram"
        ? platform
        : "general";

    const safeLength: CaptionLength =
      length === "short" || length === "long" || length === "medium"
        ? length
        : "medium";

    const caption = await generateCaption({
      topic: topic.trim(),
      platform: safePlatform,
      tone: typeof tone === "string" ? tone : undefined,
      language: typeof language === "string" ? language : "español",
      length: safeLength,
      includeHashtags: includeHashtags !== false,
      includeEmojis: includeEmojis !== false,
      brandInstructions: company.aiInstructions || "",
    });

    await consumeAiCreditAdmin(companyId, "caption");

    return NextResponse.json({
      caption,
      usage: {
        aiCaptions: usage.aiCaptions + 1,
        aiCaptionsLimit: limit,
        aiImages: usage.aiImages,
        aiImagesLimit: imagesLimit,
      },
    });
  } catch (error: any) {
    console.error("Error generando caption:", error);
    const { status, body } = jsonError(error);
    return NextResponse.json(body, { status });
  }
}
