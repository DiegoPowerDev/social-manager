import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET() {
  try {
    const credentialsSnap = await getDoc(
      doc(db, "platformCredentials", "facebook"),
    );

    if (!credentialsSnap.exists()) {
      return NextResponse.json(
        { error: "No hay credenciales de Facebook configuradas" },
        { status: 400 },
      );
    }

    const { appId } = credentialsSnap.data();

    // ← Aquí pon el Configuration ID que acabas de crear
    const configId = "1125563576591268";

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`,
      config_id: configId,
      response_type: "code",
    });

    const url = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;

    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Error iniciando auth de Facebook:", error);
    return NextResponse.json(
      { error: "Error al iniciar autenticación" },
      { status: 500 },
    );
  }
}
