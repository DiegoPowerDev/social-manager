import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL no configurada" },
      { status: 500 },
    );
  }

  try {
    const now = Timestamp.now();

    const snapshot = await adminDb
      .collection("scheduledPosts")
      .where("status", "==", "scheduled")
      .where("scheduledAt", "<=", now)
      .limit(10)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        ok: true,
        message: "No hay posts pendientes",
        processed: 0,
      });
    }

    let processed = 0;
    const details: any[] = [];

    for (const postDoc of snapshot.docs) {
      const post = postDoc.data();
      const postRef = adminDb.collection("scheduledPosts").doc(postDoc.id);
      const companyId = post.companyId as string | undefined;

      if (!companyId) {
        await postRef.update({
          status: "failed",
          results: { system: { success: false, message: "Sin companyId" } },
          updatedAt: Timestamp.now(),
        });
        details.push({ id: postDoc.id, error: "Sin companyId" });
        processed++;
        continue;
      }

      await postRef.update({
        status: "publishing",
        updatedAt: Timestamp.now(),
      });

      // Cuentas solo de esa empresa
      const accountsSnap = await adminDb
        .collection("socialAccounts")
        .where("companyId", "==", companyId)
        .get();

      const accounts = accountsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as any[];

      const facebookAccount = accounts.find((a) => a.platform === "facebook");
      const instagramAccount = accounts.find((a) => a.platform === "instagram");
      const linkedinAccount = accounts.find((a) => a.platform === "linkedin");

      const results: Record<string, { success: boolean; message?: string }> =
        {};

      if (post.platforms?.facebook && facebookAccount) {
        try {
          const res = await fetch(`${baseUrl}/api/publish/facebook`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pageId: facebookAccount.pageId,
              accessToken: facebookAccount.accessToken,
              pageName: facebookAccount.name,
              companyId,
              message: post.message || "",
              link: post.link || undefined,
              imageUrl: post.imageUrl || undefined,
              videoUrl: post.videoUrl || undefined,
            }),
          });
          const data = await res.json();
          results.facebook = {
            success: res.ok,
            message: res.ok ? "OK" : data.error || "Error",
          };
        } catch (e: any) {
          results.facebook = { success: false, message: e.message };
        }
      }

      if (post.platforms?.instagram && instagramAccount) {
        try {
          const res = await fetch(`${baseUrl}/api/publish/instagram`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              igUserId: instagramAccount.igUserId,
              accessToken: instagramAccount.accessToken,
              username: instagramAccount.username,
              companyId,
              caption:
                post.instagramMediaType === "STORIES"
                  ? undefined
                  : post.message || "",
              imageUrl: post.imageUrl || undefined,
              videoUrl: post.videoUrl || undefined,
              mediaType: post.instagramMediaType || "FEED",
            }),
          });
          const data = await res.json();
          results.instagram = {
            success: res.ok,
            message: res.ok ? "OK" : data.error || "Error",
          };
        } catch (e: any) {
          results.instagram = { success: false, message: e.message };
        }
      }

      if (post.platforms?.linkedin && linkedinAccount) {
        try {
          const res = await fetch(`${baseUrl}/api/publish/linkedin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              personId: linkedinAccount.personId,
              accessToken: linkedinAccount.accessToken,
              name: linkedinAccount.name,
              companyId,
              text: post.message || "",
              imageUrl: post.imageUrl || undefined,
              videoUrl: post.videoUrl || undefined,
            }),
          });
          const data = await res.json();
          results.linkedin = {
            success: res.ok,
            message: res.ok ? "OK" : data.error || "Error",
          };
        } catch (e: any) {
          results.linkedin = { success: false, message: e.message };
        }
      }

      const values = Object.values(results);
      const allSuccess = values.length > 0 && values.every((r) => r.success);
      const anySuccess = values.some((r) => r.success);

      await postRef.update({
        status: allSuccess || anySuccess ? "published" : "failed",
        results,
        publishedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      processed++;
      details.push({ id: postDoc.id, title: post.title, results });
    }

    return NextResponse.json({ ok: true, processed, details });
  } catch (error: any) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: error.message || "Cron failed" },
      { status: 500 },
    );
  }
}
