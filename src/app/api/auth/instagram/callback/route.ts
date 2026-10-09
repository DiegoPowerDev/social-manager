import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const companyId = req.nextUrl.searchParams.get("state"); // companyId
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/instagram?error=no_code`);
  }
  if (!companyId) {
    return NextResponse.redirect(`${baseUrl}/instagram?error=no_company`);
  }

  try {
    const credentialsSnap = await adminDb
      .collection("platformCredentials")
      .doc(`${companyId}_instagram`)
      .get();

    if (!credentialsSnap.exists) {
      return NextResponse.redirect(`${baseUrl}/instagram?error=no_credentials`);
    }

    const { appId, appSecret } = credentialsSnap.data()!;
    const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

    // 1. Code → token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        }),
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("Error token:", tokenData.error);
      return NextResponse.redirect(`${baseUrl}/instagram?error=token_error`);
    }

    const userAccessToken = tokenData.access_token as string;

    // 2. Pages + IG business
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`,
    );
    const pagesData = await pagesRes.json();

    if (!pagesData.data?.length) {
      return NextResponse.redirect(`${baseUrl}/instagram?error=no_pages`);
    }

    const pageWithIG = pagesData.data.find(
      (page: any) => page.instagram_business_account,
    );

    if (!pageWithIG) {
      return NextResponse.redirect(`${baseUrl}/instagram?error=no_instagram`);
    }

    const igAccountId = pageWithIG.instagram_business_account.id as string;
    const pageAccessToken = pageWithIG.access_token as string;

    // 3. Info IG
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}?fields=id,username,name,profile_picture_url&access_token=${pageAccessToken}`,
    );
    const igData = await igRes.json();

    // 4. Guardar con companyId
    await adminDb
      .collection("socialAccounts")
      .doc(igAccountId)
      .set(
        {
          companyId,
          platform: "instagram",
          name: igData.name || igData.username,
          username: igData.username,
          igUserId: igAccountId,
          pageId: pageWithIG.id,
          accessToken: pageAccessToken,
          profilePicture: igData.profile_picture_url || null,
          connectedAt: new Date(),
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
        { merge: true },
      );

    return NextResponse.redirect(`${baseUrl}/instagram?success=true`);
  } catch (error) {
    console.error("Error en callback de Instagram:", error);
    return NextResponse.redirect(
      `${baseUrl}/instagram?error=connection_failed`,
    );
  }
}
