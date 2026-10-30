import { NextRequest, NextResponse } from "next/server";
import { publishToLinkedIn } from "@/adapters/linkedin";
import { adminDb } from "@/lib/firebase-admin";
import { requireCompanyMember, jsonError } from "@/lib/ai-route-helpers";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { personId, name, text, imageUrl, videoUrl, companyId } =
      await req.json();

    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }
    if (!personId) {
      return NextResponse.json(
        { error: "Faltan credenciales de LinkedIn" },
        { status: 400 },
      );
    }
    if (!text?.trim() && !imageUrl && !videoUrl) {
      return NextResponse.json(
        { error: "Escribe un texto o agrega media" },
        { status: 400 },
      );
    }

    await requireCompanyMember(req, companyId);

    const accSnap = await adminDb
      .collection("socialAccounts")
      .where("companyId", "==", companyId)
      .where("platform", "==", "linkedin")
      .where("personId", "==", personId)
      .limit(1)
      .get();

    if (accSnap.empty) {
      return NextResponse.json(
        { error: "Cuenta de LinkedIn no vinculada a esta empresa" },
        { status: 403 },
      );
    }

    const account = accSnap.docs[0].data();
    const token = account.accessToken as string;

    const result = await publishToLinkedIn({
      accessToken: token,
      personId,
      text: text || "",
      imageUrl,
      videoUrl,
    });

    await adminDb.collection("publishedPosts").add({
      companyId,
      platform: "linkedin",
      personId,
      name: name || account.name || null,
      message: text || null,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      linkedinPostId: result?.id || null,
      permalink: result?.permalink || null,
      publishedAt: new Date(),
      status: "published",
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Error publicando en LinkedIn:", error);
    const { status, body } = jsonError(error);
    return NextResponse.json(body, { status });
  }
}
