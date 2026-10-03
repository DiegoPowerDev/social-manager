import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET() {
  try {
    // 1. Traemos las credenciales desde Firestore
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

    // 2. Construimos la URL de autorización
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`,
      scope: "pages_show_list,pages_read_engagement,pages_manage_posts",
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
