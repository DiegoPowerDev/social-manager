import { NextRequest, NextResponse } from "next/server";
import { generateUploadUrl } from "@/lib/r2";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Faltan filename o contentType" },
        { status: 400 },
      );
    }

    const extension = filename.split(".").pop();
    const key = `facebook/${Date.now()}-${nanoid(8)}.${extension}`;

    const {
      uploadUrl,
      publicUrl,
      key: fileKey,
    } = await generateUploadUrl(key, contentType);

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key: fileKey,
    });
  } catch (error: any) {
    console.error("Error generando URL de subida:", error);
    return NextResponse.json(
      { error: "Error al generar URL de subida" },
      { status: 500 },
    );
  }
}
