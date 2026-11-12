import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import { assertCanUpload, incrementStorage } from "@/lib/storage-admin";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { companyId, platform, contentType, fileName, size } =
      await req.json();

    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }
    if (!contentType) {
      return NextResponse.json({ error: "Falta contentType" }, { status: 400 });
    }

    const fileSize = Number(size);
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json(
        { error: "Falta size del archivo (bytes)" },
        { status: 400 },
      );
    }

    const maxSize = 200 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: "Archivo demasiado grande (máx. 200MB)" },
        { status: 400 },
      );
    }

    try {
      await assertCanUpload(companyId, fileSize);
    } catch (e: any) {
      return NextResponse.json(
        { error: e.message, code: e.code || "STORAGE_FULL" },
        { status: 403 },
      );
    }

    const safePlatform =
      (platform || "general").replace(/[^a-z0-9-_]/gi, "") || "general";
    const original = fileName || "file";
    const extension = original.includes(".")
      ? original
          .split(".")
          .pop()!
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "bin"
      : contentType.includes("video")
        ? "mp4"
        : "bin";

    const key = `companies/${companyId}/${safePlatform}/${Date.now()}-${nanoid(8)}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 600,
    });

    // Reserva de cuota con el size declarado
    await incrementStorage(companyId, fileSize);

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
      size: fileSize,
    });
  } catch (error: any) {
    console.error("Sign upload error:", error);
    return NextResponse.json(
      { error: error.message || "Error al firmar subida" },
      { status: 500 },
    );
  }
}
