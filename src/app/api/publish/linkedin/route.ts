import { NextRequest, NextResponse } from "next/server";
import { publishToLinkedIn } from "@/adapters/linkedin";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { personId, accessToken, name, text, imageUrl, videoUrl, companyId } =
      await req.json();

    if (!personId || !accessToken) {
      return NextResponse.json(
        { error: "Faltan credenciales de LinkedIn" },
        { status: 400 },
      );
    }
    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }
    if (!text?.trim() && !imageUrl && !videoUrl) {
      return NextResponse.json(
        { error: "Escribe un texto o agrega media" },
        { status: 400 },
      );
    }

    const result = await publishToLinkedIn({
      accessToken,
      personId,
      text: text || "",
      imageUrl,
      videoUrl,
    });

    await adminDb.collection("publishedPosts").add({
      companyId,
      platform: "linkedin",
      personId,
      name: name || null,
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
    return NextResponse.json(
      { error: error.message || "Error al publicar en LinkedIn" },
      { status: 500 },
    );
  }
}
