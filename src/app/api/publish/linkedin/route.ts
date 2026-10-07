import { NextRequest, NextResponse } from "next/server";
import { publishToLinkedIn } from "@/adapters/linkedin";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { personId, accessToken, name, text, imageUrl } = await req.json();

    if (!personId || !accessToken) {
      return NextResponse.json(
        { error: "Faltan credenciales de LinkedIn" },
        { status: 400 },
      );
    }

    if (!text?.trim() && !imageUrl) {
      return NextResponse.json(
        { error: "Escribe un texto o agrega una imagen" },
        { status: 400 },
      );
    }

    const result = await publishToLinkedIn({
      accessToken,
      personId,
      text: text || "",
      imageUrl,
    });

    // Guardar en historial
    await addDoc(collection(db, "publishedPosts"), {
      platform: "linkedin",
      personId,
      name: name || null,
      message: text || null,
      imageUrl: imageUrl || null,
      publishedAt: new Date(),
      linkedinResponse: result || null,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Error publicando en LinkedIn:", error);
    return NextResponse.json(
      { error: error.message || "Error al publicar en LinkedIn" },
      { status: 500 },
    );
  }
}
