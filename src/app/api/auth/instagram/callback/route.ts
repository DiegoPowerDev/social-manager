import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/instagram?error=no_code`);
  }

  try {
    const credentialsSnap = await getDoc(
      doc(db, "platformCredentials", "facebook"),
    );

    if (!credentialsSnap.exists()) {
      return NextResponse.redirect(`${baseUrl}/instagram?error=no_credentials`);
    }

    const { appId, appSecret } = credentialsSnap.data();

    // 1. Intercambiar code por token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: `${baseUrl}/api/auth/instagram/callback`,
          code,
        }),
    );

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Error token:", tokenData.error);
      return NextResponse.redirect(`${baseUrl}/instagram?error=token_error`);
    }

    const userAccessToken = tokenData.access_token;

    // 2. Obtener las Pages del usuario
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`,
    );

    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(`${baseUrl}/instagram?error=no_pages`);
    }

    const pageWithIG = pagesData.data.find(
      (page: any) => page.instagram_business_account,
    );

    if (!pageWithIG) {
      return NextResponse.redirect(`${baseUrl}/instagram?error=no_instagram`);
    }

    const igAccountId = pageWithIG.instagram_business_account.id;
    const pageAccessToken = pageWithIG.access_token;

    // 3. Obtener info de la cuenta de Instagram
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}?fields=id,username,name,profile_picture_url&access_token=${pageAccessToken}`,
    );

    const igData = await igRes.json();

    // 4. Guardar en Firestore
    await setDoc(doc(db, "socialAccounts", igAccountId), {
      platform: "instagram",
      name: igData.name || igData.username,
      username: igData.username,
      igUserId: igAccountId,
      pageId: pageWithIG.id,
      accessToken: pageAccessToken,
      profilePicture: igData.profile_picture_url || null,
      connectedAt: new Date(),
    });

    return NextResponse.redirect(`${baseUrl}/instagram?success=true`);
  } catch (error) {
    console.error("Error en callback de Instagram:", error);
    return NextResponse.redirect(
      `${baseUrl}/instagram?error=connection_failed`,
    );
  }
}
