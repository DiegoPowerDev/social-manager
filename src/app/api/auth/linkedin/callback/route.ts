import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/linkedin?error=no_code`);
  }

  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID!;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
    const redirectUri = `${baseUrl}/api/auth/linkedin/callback`;

    // 1. Intercambiar code por access_token
    const tokenRes = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      },
    );

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Error token LinkedIn:", tokenData);
      return NextResponse.redirect(`${baseUrl}/linkedin?error=token_error`);
    }

    const accessToken = tokenData.access_token;

    // 2. Obtener datos del usuario (OpenID)
    const userRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = await userRes.json();

    if (!userRes.ok) {
      console.error("Error userinfo LinkedIn:", userData);
      return NextResponse.redirect(`${baseUrl}/linkedin?error=user_error`);
    }

    // userData suele traer: sub, name, email, picture
    const personId = userData.sub; // este es el ID del miembro
    const name = userData.name || "Usuario LinkedIn";
    const email = userData.email || "";
    const picture = userData.picture || "";

    // 3. Guardar en Firestore
    await setDoc(doc(db, "socialAccounts", `linkedin_${personId}`), {
      platform: "linkedin",
      name,
      email,
      picture,
      personId, // urn se arma como urn:li:person:{personId}
      accessToken,
      connectedAt: new Date(),
    });

    return NextResponse.redirect(`${baseUrl}/linkedin?success=true`);
  } catch (error) {
    console.error("Error en callback LinkedIn:", error);
    return NextResponse.redirect(`${baseUrl}/linkedin?error=connection_failed`);
  }
}
