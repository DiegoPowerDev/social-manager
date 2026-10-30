import { NextRequest, NextResponse } from "next/server";
import { publishToInstagram } from "@/adapters/instagram";
import { adminDb } from "@/lib/firebase-admin";
import { requireCompanyMemberOrCron, jsonError } from "@/lib/ai-route-helpers"; // o muévelos a lib/api-auth.ts

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      igUserId,
      accessToken,
      caption,
      imageUrl,
      imageUrls,
      videoUrl,
      username,
      mediaType,
      companyId,
    } = body;

    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }
    if (!igUserId || !accessToken) {
      return NextResponse.json(
        { error: "Faltan datos de la cuenta" },
        { status: 400 },
      );
    }

    // 1) Usuario logueado + miembro editor/admin de la empresa
    await requireCompanyMemberOrCron(req, companyId);

    // 2) La cuenta social debe ser de ESA empresa
    const accSnap = await adminDb
      .collection("socialAccounts")
      .where("companyId", "==", companyId)
      .where("platform", "==", "instagram")
      .where("igUserId", "==", igUserId)
      .limit(1)
      .get();

    if (accSnap.empty) {
      return NextResponse.json(
        { error: "Cuenta de Instagram no vinculada a esta empresa" },
        { status: 403 },
      );
    }

    const account = accSnap.docs[0].data();
    // Usar token guardado en servidor (no confiar solo en el del cliente)
    const token = (account.accessToken as string) || accessToken;

    if (mediaType === "CAROUSEL") {
      const urls = imageUrls?.length ? imageUrls : imageUrl ? [imageUrl] : [];
      if (urls.length < 2) {
        return NextResponse.json(
          { error: "El carrusel necesita al menos 2 imágenes" },
          { status: 400 },
        );
      }
    } else if (!imageUrl && !videoUrl) {
      return NextResponse.json(
        { error: "Instagram requiere una imagen o un video" },
        { status: 400 },
      );
    }

    const result = await publishToInstagram(igUserId, token, {
      caption,
      imageUrl,
      imageUrls,
      videoUrl,
      mediaType: mediaType || "FEED",
    });

    await adminDb.collection("publishedPosts").add({
      companyId,
      platform: "instagram",
      igUserId,
      username: username || account.username || "",
      message: caption || "",
      imageUrl: imageUrl || imageUrls?.[0] || null,
      imageUrls: imageUrls || null,
      videoUrl: videoUrl || null,
      mediaType: mediaType || "FEED",
      instagramPostId: result.id || null,
      publishedAt: new Date(),
      status: "published",
      permalink: result.permalink || null,
    });

    return NextResponse.json({
      success: true,
      postId: result.id,
      permalink: result.permalink,
    });
  } catch (error: any) {
    console.error("Error publicando en Instagram:", error);
    const { status, body } = jsonError(error);
    return NextResponse.json(body, { status });
  }
}
