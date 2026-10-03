import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { platform, appId, appSecret } = await req.json();

    if (!platform || !appId || !appSecret) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // Guardamos las credenciales
    await setDoc(doc(db, "platformCredentials", platform), {
      platform,
      appId,
      appSecret,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al guardar credenciales" },
      { status: 500 },
    );
  }
}
