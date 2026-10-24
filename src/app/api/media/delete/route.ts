import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { adminDb } from "@/lib/firebase-admin";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { mediaId, companyId, uid } = await req.json();

    if (!mediaId || !companyId || !uid) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // Membership: admin o editor
    const memberSnap = await adminDb
      .collection("memberships")
      .doc(`${uid}_${companyId}`)
      .get();
    const role = memberSnap.data()?.role;
    if (!memberSnap.exists || !["admin", "editor"].includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const ref = adminDb.collection("media").doc(mediaId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "No existe" }, { status: 404 });
    }

    const data = snap.data()!;
    if (data.companyId !== companyId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Borrar de R2 si hay key
    const key =
      data.key ||
      // fallback: derivar de la URL pública
      (typeof data.url === "string"
        ? data.url.replace(/^https?:\/\/[^/]+\//, "")
        : null);

    if (key && process.env.R2_BUCKET_NAME) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
          }),
        );
      } catch (err) {
        console.error("R2 delete error:", err);
        return NextResponse.json(
          { error: "No se pudo borrar en R2" },
          { status: 500 },
        );
      }
    }

    await ref.delete();

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("media delete:", e);
    return NextResponse.json(
      { error: e.message || "Error al eliminar" },
      { status: 500 },
    );
  }
}
