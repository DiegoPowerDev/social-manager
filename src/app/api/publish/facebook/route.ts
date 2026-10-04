import { NextRequest, NextResponse } from "next/server";
import { publishPost } from "@/adapters/facebook";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { pageId, accessToken, message, link, imageUrl, videoUrl, pageName } =
      await req.json();

    if (!pageId || !accessToken) {
      return NextResponse.json(
        { error: "Faltan datos de la cuenta" },
        { status: 400 },
      );
    }

    if (!message && !imageUrl && !videoUrl) {
      return NextResponse.json(
        { error: "Debes enviar al menos un mensaje, imagen o video" },
        { status: 400 },
      );
    }

    // Publicar en Facebook
    const result = await publishPost(pageId, accessToken, {
      message,
      link,
      imageUrl,
      videoUrl,
    });

    // Guardar en el historial
    await addDoc(collection(db, "publishedPosts"), {
      platform: "facebook",
      pageId,
      pageName: pageName || "",
      message: message || "",
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      link: link || null,
      facebookPostId: result.id || result.post_id || null,
      publishedAt: new Date(),
      status: "published",
    });

    return NextResponse.json({
      success: true,
      postId: result.id || result.post_id,
    });
  } catch (error: any) {
    console.error("Error publicando en Facebook:", error);
    return NextResponse.json(
      { error: error.message || "Error al publicar" },
      { status: 500 },
    );
  }
}
