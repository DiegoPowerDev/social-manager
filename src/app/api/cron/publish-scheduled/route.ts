import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const maxDuration = 60; // segundos (ajustar si hace falta)

export async function GET(req: NextRequest) {
  // Seguridad: solo permitir con el secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Timestamp.now();

    // Posts programados cuya hora ya pasó
    const q = query(
      collection(db, "scheduledPosts"),
      where("status", "==", "scheduled"),
      where("scheduledAt", "<=", now),
      limit(10), // procesar de a pocos por ejecución
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({
        ok: true,
        message: "No hay posts pendientes",
        processed: 0,
      });
    }

    // Cargar cuentas una sola vez
    const accountsSnap = await getDocs(collection(db, "socialAccounts"));
    const accounts = accountsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as any[];

    const facebookAccount = accounts.find((a) => a.platform === "facebook");
    const instagramAccount = accounts.find((a) => a.platform === "instagram");
    const linkedinAccount = accounts.find((a) => a.platform === "linkedin");

    let processed = 0;
    const details: any[] = [];

    for (const postDoc of snapshot.docs) {
      const post = postDoc.data();
      const postRef = doc(db, "scheduledPosts", postDoc.id);

      // Marcar como "publishing" para evitar doble publicación
      await updateDoc(postRef, {
        status: "publishing",
        updatedAt: Timestamp.now(),
      });

      const results: Record<string, { success: boolean; message?: string }> =
        {};

      // Facebook
      if (post.platforms?.facebook && facebookAccount) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/publish/facebook`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pageId: facebookAccount.pageId,
                accessToken: facebookAccount.accessToken,
                pageName: facebookAccount.name,
                message: post.message || "",
                link: post.link || undefined,
                imageUrl: post.imageUrl || undefined,
                videoUrl: post.videoUrl || undefined,
              }),
            },
          );
          const data = await res.json();
          results.facebook = {
            success: res.ok,
            message: res.ok ? "OK" : data.error || "Error",
          };
        } catch (e: any) {
          results.facebook = { success: false, message: e.message };
        }
      }

      // Instagram
      if (post.platforms?.instagram && instagramAccount) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/publish/instagram`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                igUserId: instagramAccount.igUserId,
                accessToken: instagramAccount.accessToken,
                username: instagramAccount.username,
                caption:
                  post.instagramMediaType === "STORIES"
                    ? undefined
                    : post.message || "",
                imageUrl: post.imageUrl || undefined,
                videoUrl: post.videoUrl || undefined,
                mediaType: post.instagramMediaType || "FEED",
              }),
            },
          );
          const data = await res.json();
          results.instagram = {
            success: res.ok,
            message: res.ok ? "OK" : data.error || "Error",
          };
        } catch (e: any) {
          results.instagram = { success: false, message: e.message };
        }
      }

      // LinkedIn
      if (post.platforms?.linkedin && linkedinAccount) {
        try {
          if (post.videoUrl && !post.imageUrl) {
            results.linkedin = {
              success: false,
              message: "LinkedIn solo soporta texto e imagen por ahora",
            };
          } else {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL}/api/publish/linkedin`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  personId: linkedinAccount.personId,
                  accessToken: linkedinAccount.accessToken,
                  name: linkedinAccount.name,
                  text: post.message || "",
                  imageUrl: post.imageUrl || undefined,
                }),
              },
            );
            const data = await res.json();
            results.linkedin = {
              success: res.ok,
              message: res.ok ? "OK" : data.error || "Error",
            };
          }
        } catch (e: any) {
          results.linkedin = { success: false, message: e.message };
        }
      }

      const allSuccess = Object.values(results).every((r) => r.success);
      const anySuccess = Object.values(results).some((r) => r.success);

      await updateDoc(postRef, {
        status: allSuccess ? "published" : anySuccess ? "published" : "failed",
        results,
        publishedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      processed++;
      details.push({ id: postDoc.id, title: post.title, results });
    }

    return NextResponse.json({
      ok: true,
      processed,
      details,
    });
  } catch (error: any) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: error.message || "Cron failed" },
      { status: 500 },
    );
  }
}
