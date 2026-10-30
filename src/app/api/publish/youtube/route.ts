import { NextRequest, NextResponse } from "next/server";
import { publishToYouTube } from "@/adapters/youtube";
import { getValidYouTubeAccessToken } from "@/lib/youtube-token";
import { adminDb } from "@/lib/firebase-admin";
import { requireCompanyMemberOrCron, jsonError } from "@/lib/ai-route-helpers";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const {
      companyId,
      channelId,
      accountDocId,
      title,
      description,
      videoUrl,
      privacyStatus,
    } = await req.json();

    if (!companyId || !channelId || !accountDocId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }
    if (!title?.trim() || !videoUrl) {
      return NextResponse.json(
        { error: "Título y video son obligatorios" },
        { status: 400 },
      );
    }

    await requireCompanyMemberOrCron(req, companyId);

    const accRef = adminDb.collection("socialAccounts").doc(accountDocId);
    const accSnap = await accRef.get();

    if (!accSnap.exists) {
      return NextResponse.json(
        { error: "Cuenta de YouTube no encontrada" },
        { status: 403 },
      );
    }

    const account = accSnap.data()!;
    if (
      account.companyId !== companyId ||
      account.platform !== "youtube" ||
      account.channelId !== channelId
    ) {
      return NextResponse.json(
        { error: "Cuenta de YouTube no vinculada a esta empresa" },
        { status: 403 },
      );
    }

    const token = await getValidYouTubeAccessToken({
      companyId,
      accountDocId,
      accessToken: account.accessToken as string,
      refreshToken: (account.refreshToken as string) || null,
      expiresAt: account.expiresAt ?? null,
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
    const { status, body } = jsonError(error);
    return NextResponse.json(body, { status });
  }
}
