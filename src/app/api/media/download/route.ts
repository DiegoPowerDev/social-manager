import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { adminDb } from "@/lib/firebase-admin";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: NextRequest) {
  try {
    const mediaId = req.nextUrl.searchParams.get("mediaId");
    const companyId = req.nextUrl.searchParams.get("companyId");
    const uid = req.nextUrl.searchParams.get("uid");

    if (!mediaId || !companyId || !uid) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const memberSnap = await adminDb
      .collection("memberships")
      .doc(`${uid}_${companyId}`)
      .get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const snap = await adminDb.collection("media").doc(mediaId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "No existe" }, { status: 404 });
    }

    const data = snap.data()!;
    if (data.companyId !== companyId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const key =
      data.key ||
      (typeof data.url === "string"
        ? data.url.replace(/^https?:\/\/[^/]+\//, "")
        : null);

    if (!key) {
      return NextResponse.json(
        { error: "Sin key de archivo" },
        { status: 400 },
      );
    }

    const out = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      }),
    );

    const body = await out.Body?.transformToByteArray();
    if (!body) {
      return NextResponse.json({ error: "Archivo vacío" }, { status: 404 });
    }

    const fileName = (data.fileName || "archivo").replace(/[^\w.\-]+/g, "_");
    const contentType =
      data.mimeType || out.ContentType || "application/octet-stream";

    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (e: any) {
    console.error("download:", e);
    return NextResponse.json(
      { error: e.message || "Error al descargar" },
      { status: 500 },
    );
  }
}
