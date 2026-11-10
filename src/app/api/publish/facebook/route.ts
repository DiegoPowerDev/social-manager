import { NextRequest, NextResponse } from "next/server";
import { publishPost } from "@/adapters/facebook";
import { adminDb } from "@/lib/firebase-admin";
import { jsonError, requireCompanyMemberOrCron } from "@/lib/ai-route-helpers";
import { getActorByUid } from "@/lib/request-actor";

export async function POST(req: NextRequest) {
  try {
    const {
      pageId,
      message,
      link,
      imageUrl,
      videoUrl,
      pageName,
      companyId,
      // Autoría (cron o cliente)
      publishedByUid,
      publishedByName,
      publishedByEmail,
      scheduledPostId,
    } = await req.json();

    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }
    if (!pageId) {
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

    const member = await requireCompanyMemberOrCron(req, companyId);

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
    const accSnap = await adminDb
      .collection("socialAccounts")
      .where("companyId", "==", companyId)
      .where("platform", "==", "facebook")
      .where("pageId", "==", pageId)
      .limit(1)
      .get();

    if (accSnap.empty) {
      return NextResponse.json(
        { error: "Cuenta de Facebook no vinculada a esta empresa" },
        { status: 403 },
      );
    }
    const account = accSnap.docs[0].data();
    const token = account.accessToken as string;

    const result = await publishPost(pageId, token, {
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
      pageName: pageName || account.name || "",
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
      // Autoría
      publishedByUid: byUid,
      publishedByName: byName,
      publishedByEmail: byEmail,
      source: postSource,
      scheduledPostId: scheduledPostId || null,
    });

    return NextResponse.json({
      success: true,
      postId: facebookPostId,
    });
  } catch (error: any) {
    console.error("Error publicando en Facebook:", error);
    const { status, body } = jsonError(error);
    return NextResponse.json(body, { status });
  }
}
