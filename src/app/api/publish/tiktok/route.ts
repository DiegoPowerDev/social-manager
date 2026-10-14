import { NextRequest, NextResponse } from "next/server";
import { publishToTikTok } from "@/adapters/tiktok";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const {
      accessToken,
      openId,
      name,
      title,
      videoUrl,
      companyId,
      privacyLevel,
    } = await req.json();

    if (!accessToken || !videoUrl) {
      return NextResponse.json(
        { error: "Faltan accessToken o videoUrl" },
        { status: 400 },
      );
    }
    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json(
        { error: "El título/caption es obligatorio" },
        { status: 400 },
      );
    }

    const result = await publishToTikTok({
      accessToken,
      title: title.trim(),
      videoUrl,
      privacyLevel: privacyLevel || "SELF_ONLY",
    });

    await adminDb.collection("publishedPosts").add({
      companyId,
      platform: "tiktok",
      openId: openId || null,
      name: name || null,
      message: title || null,
      videoUrl,
      tiktokPublishId: result.publishId || null,
      publishedAt: new Date(),
      status: result.status || "published",
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Publish TikTok:", error);
    return NextResponse.json(
      { error: error.message || "Error al publicar en TikTok" },
      { status: 500 },
    );
  }
}
