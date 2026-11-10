import { NextRequest, NextResponse } from "next/server";
import { publishToYouTube } from "@/adapters/youtube";
import { getValidYouTubeAccessToken } from "@/lib/youtube-token";
import { adminDb } from "@/lib/firebase-admin";
import { requireCompanyMemberOrCron, jsonError } from "@/lib/ai-route-helpers";
import { getActorByUid } from "@/lib/request-actor";

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
      // Autoría (cron o cliente)
      publishedByUid,
      publishedByName,
      publishedByEmail,
      scheduledPostId,
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

    const member = await requireCompanyMemberOrCron(req, companyId);
    const accRef = adminDb.collection("socialAccounts").doc(accountDocId);
    const accSnap = await accRef.get();

    if (!accSnap.exists) {
      return NextResponse.json(
        { error: "Cuenta de YouTube no encontrada" },
        { status: 403 },
      );
    }

    let byUid: string | null = null;
    let byName: string | null = null;
    let byEmail: string | null = null;
    let postSource: "manual" | "schedule" = "manual";

    if (member?.uid) {
      const actor = await getActorByUid(member.uid);
      byUid = actor.uid;
      byName = actor.name;
      byEmail = actor.email;
      postSource = "manual";
    } else if (publishedByUid || publishedByName) {
      byUid = publishedByUid || null;
      byName = publishedByName || "Programado";
      byEmail = publishedByEmail || null;
      postSource = "schedule";
    } else {
      byUid = null;
      byName = "Sistema";
      byEmail = null;
      postSource = "schedule";
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
      publishedByUid: byUid,
      publishedByName: byName,
      publishedByEmail: byEmail,
      source: postSource,
      scheduledPostId: scheduledPostId || null,
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
