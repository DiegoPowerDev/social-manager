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
      imageUrls,
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

    if (mediaType === "CAROUSEL") {
      const urls = imageUrls?.length ? imageUrls : imageUrl ? [imageUrl] : [];
      if (urls.length < 2) {
        return NextResponse.json(
          { error: "El carrusel necesita al menos 2 imágenes" },
          { status: 400 },
        );
      }
    } else if (!imageUrl && !videoUrl) {
      return NextResponse.json(
        { error: "Instagram requiere una imagen o un video" },
        { status: 400 },
      );
    }

    const result = await publishToInstagram(igUserId, accessToken, {
      caption,
      imageUrl,
      imageUrls,
      videoUrl,
      mediaType: mediaType || "FEED",
    });

    await adminDb.collection("publishedPosts").add({
      companyId,
      platform: "instagram",
      igUserId,
      username: username || "",
      message: caption || "",
      imageUrl: imageUrl || imageUrls?.[0] || null,
      imageUrls: imageUrls || null,
      videoUrl: videoUrl || null,
      mediaType: mediaType || "FEED",
      instagramPostId: result.id || null,
      publishedAt: new Date(),
      status: "published",
      permalink: result.permalink || null,
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
