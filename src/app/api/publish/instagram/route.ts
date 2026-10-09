import { NextRequest, NextResponse } from "next/server";
import { publishToInstagram } from "@/adapters/instagram";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const {
      igUserId,
      accessToken,
      caption,
      imageUrl,
      videoUrl,
      username,
      mediaType,
      companyId,
    } = await req.json();

    if (!igUserId || !accessToken) {
      return NextResponse.json(
        { error: "Faltan datos de la cuenta" },
        { status: 400 },
      );
    }

    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }

    if (!imageUrl && !videoUrl) {
      return NextResponse.json(
        { error: "Instagram requiere una imagen o un video" },
        { status: 400 },
      );
    }

    const result = await publishToInstagram(igUserId, accessToken, {
      caption,
      imageUrl,
      videoUrl,
      mediaType: mediaType || "FEED",
    });

    await adminDb.collection("publishedPosts").add({
      companyId,
      platform: "instagram",
      igUserId,
      username: username || "",
      message: caption || "",
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      instagramPostId: result.id || null,
      permalink: result.permalink || null,
      publishedAt: new Date(),
      status: "published",
    });

    return NextResponse.json({
      success: true,
      postId: result.id,
      permalink: result.permalink,
    });
  } catch (error: any) {
    console.error("Error publicando en Instagram:", error);
    return NextResponse.json(
      { error: error.message || "Error al publicar" },
      { status: 500 },
    );
  }
}
