import { NextRequest, NextResponse } from "next/server";
import { publishToInstagram } from "@/adapters/instagram";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

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
    } = await req.json();

    if (!igUserId || !accessToken) {
      return NextResponse.json(
        { error: "Faltan datos de la cuenta" },
        { status: 400 },
      );
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

    // Guardar en historial
    await addDoc(collection(db, "publishedPosts"), {
      platform: "instagram",
      igUserId,
      username: username || "",
      message: caption || "",
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      instagramPostId: result.id || null,
      publishedAt: new Date(),
      status: "published",
    });

    return NextResponse.json({
      success: true,
      postId: result.id,
    });
  } catch (error: any) {
    console.error("Error publicando en Instagram:", error);
    return NextResponse.json(
      { error: error.message || "Error al publicar" },
      { status: 500 },
    );
  }
}
