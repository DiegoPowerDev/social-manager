import { NextRequest, NextResponse } from "next/server";
import { publishToTikTok } from "@/adapters/tiktok";
import { adminDb } from "@/lib/firebase-admin";
import { requireCompanyMemberOrCron, jsonError } from "@/lib/ai-route-helpers";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      openId,
      name,
      title,
      videoUrl,
      companyId,
      privacyLevel,
      disableComment,
      disableDuet,
      disableStitch,
      brandContentToggle,
      brandOrganicToggle,
    } = body;

    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }
    if (!videoUrl) {
      return NextResponse.json({ error: "Falta videoUrl" }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json(
        { error: "El título/caption es obligatorio" },
        { status: 400 },
      );
    }
    if (!privacyLevel) {
      return NextResponse.json(
        { error: "Debes elegir la visibilidad" },
        { status: 400 },
      );
    }

    // Comercial on sin opción
    const commercialOn = !!(brandContentToggle || brandOrganicToggle);
    // Si envías un flag commercialDisclosureEnabled desde el front:
    if (body.commercialDisclosure === true) {
      if (!brandContentToggle && !brandOrganicToggle) {
        return NextResponse.json(
          {
            error:
              "Indica si el contenido promociona tu marca, un tercero, o ambos",
          },
          { status: 400 },
        );
      }
      if (brandContentToggle && privacyLevel === "SELF_ONLY") {
        return NextResponse.json(
          {
            error:
              "Branded content no puede publicarse solo para ti (privacidad privada)",
          },
          { status: 400 },
        );
      }
    }

    await requireCompanyMemberOrCron(req, companyId);

    const accSnap = await adminDb
      .collection("socialAccounts")
      .where("companyId", "==", companyId)
      .where("platform", "==", "tiktok")
      .limit(5)
      .get();

    if (accSnap.empty) {
      return NextResponse.json(
        { error: "Cuenta de TikTok no vinculada a esta empresa" },
        { status: 403 },
      );
    }

    let account = accSnap.docs[0].data();
    let docId = accSnap.docs[0].id;
    if (openId) {
      const match = accSnap.docs.find((d) => d.data().openId === openId);
      if (!match) {
        return NextResponse.json(
          { error: "Cuenta de TikTok no vinculada a esta empresa" },
          { status: 403 },
        );
      }
      account = match.data();
      docId = match.id;
    }

    const result = await publishToTikTok({
      accessToken: account.accessToken as string,
      title: title.trim(),
      videoUrl,
      privacyLevel,
      disableComment: !!disableComment,
      disableDuet: !!disableDuet,
      disableStitch: !!disableStitch,
      brandContentToggle: !!brandContentToggle,
      brandOrganicToggle: !!brandOrganicToggle,
    });

    await adminDb.collection("publishedPosts").add({
      companyId,
      platform: "tiktok",
      openId: account.openId || openId || null,
      name: name || account.name || account.username || null,
      message: title || null,
      videoUrl,
      privacyLevel,
      brandContentToggle: !!brandContentToggle,
      brandOrganicToggle: !!brandOrganicToggle,
      tiktokPublishId: result.publishId || null,
      publishedAt: new Date(),
      status: result.status || "published",
      socialAccountId: docId,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Publish TikTok:", error);
    const { status, body } = jsonError(error);
    return NextResponse.json(body, { status });
  }
}
