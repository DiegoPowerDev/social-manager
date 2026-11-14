import { NextRequest, NextResponse } from "next/server";
import { generateImage, AiSafetyError, isGeminiSafetyError } from "@/lib/ai";
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
import { adminDb, FieldValue } from "@/lib/firebase-admin";

function safetyRef(companyId: string, uid: string) {
  return adminDb
    .collection("companies")
    .doc(companyId)
    .collection("aiSafety")
    .doc(uid);
}

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

    const { uid } = await requireCompanyMember(req, companyId);

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

    // --- Bloqueo por usuario ---
    const sRef = safetyRef(companyId, uid);
    const sSnap = await sRef.get();
    const safety = sSnap.data() || {};
    if (safety.imageBlocked === true) {
      return NextResponse.json(
        {
          error:
            "La generación de imágenes está bloqueada en tu usuario por incumplir las políticas de contenido. Contacta a soporte o a un admin de la empresa.",
          code: "AI_IMAGE_BLOCKED",
        },
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

    try {
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
    } catch (genErr: any) {
      const safetyHit =
        genErr instanceof AiSafetyError || isGeminiSafetyError(genErr);

      if (!safetyHit) throw genErr;

      const prevWarnings = Number(safety.imageWarnings || 0);
      const nextWarnings = prevWarnings + 1;
      const block = nextWarnings >= 2;

      await sRef.set(
        {
          imageWarnings: nextWarnings,
          imageBlocked: block,
          lastPrompt: prompt.trim().slice(0, 2000),
          lastFinalPrompt: finalPrompt.slice(0, 2000),
          lastAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // Historial de intentos (auditoría)
      await adminDb
        .collection("companies")
        .doc(companyId)
        .collection("aiSafetyLogs")
        .add({
          uid,
          prompt: prompt.trim().slice(0, 2000),
          warningNumber: nextWarnings,
          blocked: block,
          createdAt: FieldValue.serverTimestamp(),
        });

      if (block) {
        return NextResponse.json(
          {
            error:
              "Segundo intento contra las políticas de contenido. Se bloqueó la generación de imágenes para tu usuario y se registró el prompt.",
            code: "AI_IMAGE_BLOCKED",
          },
          { status: 403 },
        );
      }

      return NextResponse.json(
        {
          error:
            "Este prompt incumple las políticas de contenido (p. ej. menores o contenido sexual). Si vuelves a intentarlo con contenido no permitido, se bloqueará la generación de imágenes en tu usuario.",
          code: "AI_SAFETY_WARNING",
        },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("Error generando imagen:", error);
    const { status, body } = jsonError(error);
    return NextResponse.json(body, { status });
  }
}
