import { NextRequest, NextResponse } from "next/server";
import { publishPost } from "@/adapters/facebook";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const {
      pageId,
      accessToken,
      message,
      link,
      imageUrl,
      videoUrl,
      pageName,
      companyId,
    } = await req.json();

    if (!pageId || !accessToken) {
      return NextResponse.json(
        { error: "Faltan datos de la cuenta" },
        { status: 400 },
      );
    }

    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }

    if (!message && !imageUrl && !videoUrl) {
      return NextResponse.json(
        { error: "Debes enviar al menos un mensaje, imagen o video" },
        { status: 400 },
      );
    }

    const result = await publishPost(pageId, accessToken, {
      message,
      link,
      imageUrl,
      videoUrl,
    });

    const facebookPostId = result.id || result.post_id || null;

    await adminDb.collection("publishedPosts").add({
      companyId,
      platform: "facebook",
      pageId,
      pageName: pageName || "",
      message: message || "",
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      link: link || null,
      facebookPostId,
      permalink: facebookPostId
        ? `https://www.facebook.com/${facebookPostId}`
        : null,
      publishedAt: new Date(),
      status: "published",
    });

    return NextResponse.json({
      success: true,
      postId: facebookPostId,
    });
  } catch (error: any) {
    console.error("Error publicando en Facebook:", error);
    return NextResponse.json(
      { error: error.message || "Error al publicar" },
      { status: 500 },
    );
  }
}
