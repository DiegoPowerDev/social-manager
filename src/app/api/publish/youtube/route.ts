import { NextRequest, NextResponse } from "next/server";
import { publishToYouTube } from "@/adapters/youtube";
import { getValidYouTubeAccessToken } from "@/lib/youtube-token";
import { adminDb } from "@/lib/firebase-admin";

export const maxDuration = 300; // videos pueden tardar

export async function POST(req: NextRequest) {
  try {
    const {
      companyId,
      channelId,
      accessToken,
      refreshToken,
      accountDocId,
      title,
      description,
      videoUrl,
      privacyStatus,
    } = await req.json();

    if (!companyId || !channelId || !accessToken || !accountDocId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }
    if (!title?.trim() || !videoUrl) {
      return NextResponse.json(
        { error: "Título y video son obligatorios" },
        { status: 400 },
      );
    }

    const token = await getValidYouTubeAccessToken({
      companyId,
      accountDocId,
      accessToken,
      refreshToken,
    });

    const result = await publishToYouTube({
      accessToken: token,
      title,
      description,
      videoUrl,
      privacyStatus: privacyStatus || "public",
    });

    await adminDb.collection("publishedPosts").add({
      companyId,
      platform: "youtube",
      channelId,
      message: title,
      title,
      description: description || null,
      videoUrl,
      youtubeVideoId: result.id,
      permalink: result.permalink,
      publishedAt: new Date(),
      status: "published",
    });

    return NextResponse.json({
      success: true,
      videoId: result.id,
      permalink: result.permalink,
    });
  } catch (error: any) {
    console.error("YouTube publish error:", error);
    return NextResponse.json(
      { error: error.message || "Error al publicar en YouTube" },
      { status: 500 },
    );
  }
}
