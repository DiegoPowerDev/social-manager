import { NextRequest, NextResponse } from "next/server";
import { publishToTikTok } from "@/adapters/tiktok";
import { adminDb } from "@/lib/firebase-admin";
import { requireCompanyMemberOrCron, jsonError } from "@/lib/ai-route-helpers";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { openId, name, title, videoUrl, companyId, privacyLevel } =
      await req.json();

    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }
    if (!videoUrl) {
      return NextResponse.json({ error: "Falta videoUrl" }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json(
        { error: "El título/caption es obligatorio" },
        { status: 400 },
      );
    }

    await requireCompanyMemberOrCron(req, companyId);

    let q = adminDb
      .collection("socialAccounts")
      .where("companyId", "==", companyId)
      .where("platform", "==", "tiktok")
      .limit(5);

    const accSnap = await q.get();
    if (accSnap.empty) {
      return NextResponse.json(
        { error: "Cuenta de TikTok no vinculada a esta empresa" },
        { status: 403 },
      );
    }

    // Preferir openId si viene; si no, primera cuenta de la empresa
    let account = accSnap.docs[0].data();
    let docId = accSnap.docs[0].id;
    if (openId) {
      const match = accSnap.docs.find((d) => d.data().openId === openId);
      if (!match) {
        return NextResponse.json(
          { error: "Cuenta de TikTok no vinculada a esta empresa" },
          { status: 403 },
        );
      }
      account = match.data();
      docId = match.id;
    }

    const token = account.accessToken as string;

    const result = await publishToTikTok({
      accessToken: token,
      title: title.trim(),
      videoUrl,
      privacyLevel: privacyLevel || undefined,
    });

    await adminDb.collection("publishedPosts").add({
      companyId,
      platform: "tiktok",
      openId: account.openId || openId || null,
      name: name || account.name || account.username || null,
      message: title || null,
      videoUrl,
      tiktokPublishId: result.publishId || null,
      publishedAt: new Date(),
      status: result.status || "published",
      socialAccountId: docId,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Publish TikTok:", error);
    const { status, body } = jsonError(error);
    return NextResponse.json(body, { status });
  }
}
