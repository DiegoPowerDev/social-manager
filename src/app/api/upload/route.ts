import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const platform = (formData.get("platform") as string) || "general";
    const companyId = (formData.get("companyId") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "File missing" }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }

    // Límites básicos
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Archivo demasiado grande (máx. 200MB)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name || "file";
    const extension = originalName.includes(".")
      ? originalName.split(".").pop()?.toLowerCase() || "bin"
      : "bin";

    const safePlatform = platform.replace(/[^a-z0-9-_]/gi, "") || "general";
    // Aislamiento por empresa
    const key = `companies/${companyId}/${safePlatform}/${Date.now()}-${nanoid(8)}.${extension}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      }),
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({
      publicUrl,
      key,
      contentType: file.type,
    });
  } catch (error: any) {
    console.error("R2 Upload Error:", error);
    return NextResponse.json(
      { error: error.message || "Error uploading to R2" },
      { status: 500 },
    );
  }
}
