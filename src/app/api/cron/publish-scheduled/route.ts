import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export const maxDuration = 60;

type PlanTier = "free" | "basic" | "premium";

const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  basic: 1,
  premium: 2,
};

function normalizePlan(p: unknown): PlanTier {
  if (p === "basic" || p === "premium" || p === "free") return p;
  // planes legacy
  if (p === "monthly" || p === "yearly") return "premium";
  return "free";
}

function isStillActive(until?: string | null): boolean {
  if (!until) return true; // sin fecha = vigente hasta que lo quites
  const t = new Date(until).getTime();
  if (Number.isNaN(t)) return true;
  return t > Date.now();
}

/** Misma prioridad que en la app: cortesía > socio > plan de cobro */
function getEffectivePlanFromCompany(company: any): {
  plan: PlanTier;
  source: "courtesy" | "partner" | "billing";
} {
  const courtesy = company?.courtesy;
  if (courtesy?.active && isStillActive(courtesy.until)) {
    return {
      plan: normalizePlan(courtesy.plan || "premium"),
      source: "courtesy",
    };
  }

  const partner = company?.partner;
  if (partner?.active && isStillActive(partner.until)) {
    return {
      plan: normalizePlan(partner.tier || partner.plan || "basic"),
      source: "partner",
    };
  }

  return {
    plan: normalizePlan(company?.plan || "free"),
    source: "billing",
  };
}

/** Redes permitidas por plan de producto */
function platformAllowed(
  platform: "facebook" | "instagram" | "linkedin" | "youtube" | "tiktok",
  plan: PlanTier,
): boolean {
  if (plan === "free") return false; // free: no publica programados
  if (plan === "basic") {
    return (
      platform === "facebook" ||
      platform === "instagram" ||
      platform === "youtube"
    );
  }
  // premium
  return true;
}

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

      // —— Plan efectivo de la empresa ——
      const companySnap = await adminDb
        .collection("companies")
        .doc(companyId)
        .get();
      const company = companySnap.exists ? companySnap.data() : null;
      const { plan: effectivePlan } = getEffectivePlanFromCompany(company);

      // Free (sin cortesía/socio): no publicar programados
      if (effectivePlan === "free") {
        await postRef.update({
          status: "failed",
          results: {
            system: {
              success: false,
              message:
                "Membresía inactiva o plan free: la publicación programada no se envió",
            },
          },
          updatedAt: Timestamp.now(),
        });
        details.push({
          id: postDoc.id,
          title: post.title,
          skipped: "plan_free",
        });
        processed++;
        continue;
      }

      await postRef.update({
        status: "publishing",
        updatedAt: Timestamp.now(),
      });

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
      const youtubeAccount = accounts.find((a) => a.platform === "youtube");
      const tiktokAccount = accounts.find((a) => a.platform === "tiktok");

      const results: Record<string, { success: boolean; message?: string }> =
        {};

      // —— Facebook ——
      if (post.platforms?.facebook) {
        if (!platformAllowed("facebook", effectivePlan)) {
          results.facebook = {
            success: false,
            message: "No incluido en tu plan",
          };
        } else if (!facebookAccount) {
          results.facebook = {
            success: false,
            message: "Cuenta Facebook no conectada",
          };
        } else {
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
      }

      // —— Instagram ——
      if (post.platforms?.instagram) {
        if (!platformAllowed("instagram", effectivePlan)) {
          results.instagram = {
            success: false,
            message: "No incluido en tu plan",
          };
        } else if (!instagramAccount) {
          results.instagram = {
            success: false,
            message: "Cuenta Instagram no conectada",
          };
        } else {
          const mediaType = post.instagramMediaType || "FEED";
          try {
            if (mediaType === "CAROUSEL") {
              const urls = Array.isArray(post.imageUrls)
                ? post.imageUrls.filter(Boolean)
                : [];
              if (urls.length < 2) {
                results.instagram = {
                  success: false,
                  message: "Carrusel requiere al menos 2 imágenes",
                };
              } else {
                const res = await fetch(`${baseUrl}/api/publish/instagram`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    igUserId: instagramAccount.igUserId,
                    accessToken: instagramAccount.accessToken,
                    username: instagramAccount.username,
                    companyId,
                    caption: post.message || "",
                    imageUrl: urls[0],
                    imageUrls: urls,
                    mediaType: "CAROUSEL",
                  }),
                });
                const data = await res.json();
                results.instagram = {
                  success: res.ok,
                  message: res.ok ? "OK" : data.error || "Error",
                };
              }
            } else if (mediaType === "REELS" && !post.videoUrl) {
              results.instagram = {
                success: false,
                message: "Reels requiere video",
              };
            } else if (
              mediaType !== "REELS" &&
              !post.imageUrl &&
              !post.videoUrl
            ) {
              results.instagram = {
                success: false,
                message: "Instagram requiere imagen o video",
              };
            } else {
              const res = await fetch(`${baseUrl}/api/publish/instagram`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  igUserId: instagramAccount.igUserId,
                  accessToken: instagramAccount.accessToken,
                  username: instagramAccount.username,
                  companyId,
                  caption:
                    mediaType === "STORIES" ? undefined : post.message || "",
                  imageUrl: post.imageUrl || undefined,
                  videoUrl: post.videoUrl || undefined,
                  mediaType,
                }),
              });
              const data = await res.json();
              results.instagram = {
                success: res.ok,
                message: res.ok ? "OK" : data.error || "Error",
              };
            }
          } catch (e: any) {
            results.instagram = { success: false, message: e.message };
          }
        }
      }

      // —— LinkedIn (solo premium+) ——
      if (post.platforms?.linkedin) {
        if (!platformAllowed("linkedin", effectivePlan)) {
          results.linkedin = {
            success: false,
            message: "LinkedIn requiere plan Premium (o beneficio equivalente)",
          };
        } else if (!linkedinAccount) {
          results.linkedin = {
            success: false,
            message: "Cuenta LinkedIn no conectada",
          };
        } else {
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
      }

      // —— YouTube ——
      if (post.platforms?.youtube) {
        if (!platformAllowed("youtube", effectivePlan)) {
          results.youtube = {
            success: false,
            message: "No incluido en tu plan",
          };
        } else if (!youtubeAccount) {
          results.youtube = {
            success: false,
            message: "Cuenta YouTube no conectada",
          };
        } else if (!post.videoUrl) {
          results.youtube = {
            success: false,
            message: "YouTube requiere video",
          };
        } else {
          try {
            const res = await fetch(`${baseUrl}/api/publish/youtube`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                companyId,
                channelId: youtubeAccount.channelId,
                accessToken: youtubeAccount.accessToken,
                refreshToken: youtubeAccount.refreshToken,
                accountDocId: youtubeAccount.id,
                title:
                  post.youtubeTitle ||
                  post.title ||
                  (post.message || "").slice(0, 100) ||
                  "Video",
                description: post.message || "",
                videoUrl: post.videoUrl,
                privacyStatus: post.youtubePrivacy || "public",
              }),
            });
            const data = await res.json();
            results.youtube = {
              success: res.ok,
              message: res.ok ? "OK" : data.error || "Error",
            };
          } catch (e: any) {
            results.youtube = { success: false, message: e.message };
          }
        }
      }

      // —— TikTok (solo premium+) ——
      if (post.platforms?.tiktok) {
        if (!platformAllowed("tiktok", effectivePlan)) {
          results.tiktok = {
            success: false,
            message: "TikTok requiere plan Premium (o beneficio equivalente)",
          };
        } else if (!tiktokAccount) {
          results.tiktok = {
            success: false,
            message: "Cuenta TikTok no conectada",
          };
        } else if (!post.videoUrl) {
          results.tiktok = {
            success: false,
            message: "TikTok requiere video",
          };
        } else {
          try {
            const res = await fetch(`${baseUrl}/api/publish/tiktok`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                companyId,
                accessToken: tiktokAccount.accessToken,
                openId: tiktokAccount.openId,
                name: tiktokAccount.name || tiktokAccount.username,
                title: post.message || post.title || "Video",
                videoUrl: post.videoUrl,
                privacyLevel: post.tiktokPrivacy || undefined,
              }),
            });
            const data = await res.json();
            results.tiktok = {
              success: res.ok,
              message: res.ok ? "OK" : data.error || "Error",
            };
          } catch (e: any) {
            results.tiktok = { success: false, message: e.message };
          }
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
      details.push({
        id: postDoc.id,
        title: post.title,
        effectivePlan,
        results,
      });
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
