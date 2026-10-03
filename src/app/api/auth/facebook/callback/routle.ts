import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/facebook?error=no_code`);
  }

  try {
    // 1. Traemos las credenciales
    const credentialsSnap = await getDoc(
      doc(db, "platformCredentials", "facebook"),
    );

    if (!credentialsSnap.exists()) {
      return NextResponse.redirect(`${baseUrl}/facebook?error=no_credentials`);
    }

    const { appId, appSecret } = credentialsSnap.data();

    // 2. Intercambiamos el code por token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: `${baseUrl}/api/auth/facebook/callback`,
          code,
        }),
    );

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Error obteniendo token:", tokenData.error);
      return NextResponse.redirect(`${baseUrl}/facebook?error=token_error`);
    }

    const userAccessToken = tokenData.access_token;

    // 3. Obtenemos las Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`,
    );

    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(`${baseUrl}/facebook?error=no_pages`);
    }

    // Tomamos la primera página
    const page = pagesData.data[0];

    // 4. Guardamos en Firestore
    await setDoc(doc(db, "socialAccounts", page.id), {
      platform: "facebook",
      name: page.name,
      pageId: page.id,
      accessToken: page.access_token,
      connectedAt: new Date(),
    });

    return NextResponse.redirect(`${baseUrl}/facebook?success=true`);
  } catch (error) {
    console.error("Error en callback de Facebook:", error);
    return NextResponse.redirect(`${baseUrl}/facebook?error=connection_failed`);
  }
}
