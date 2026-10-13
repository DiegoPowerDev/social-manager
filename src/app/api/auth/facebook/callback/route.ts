import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const companyId = req.nextUrl.searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/dashboard/facebook?error=no_code`);
  }
  if (!companyId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/facebook?error=no_company`,
    );
  }
  if (!appId || !appSecret) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/facebook?error=no_credentials`,
    );
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;

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
      console.error("FB token error:", tokenData.error);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/facebook?error=token_error`,
      );
    }

    const userAccessToken = tokenData.access_token as string;

    // Token de larga duración (aprox. 60 días)
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: userAccessToken,
        }),
    );
    const longData = await longRes.json();
    const longUserToken = longData.access_token || userAccessToken;
    const expiresIn = longData.expires_in || 60 * 24 * 60 * 60;

    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${longUserToken}`,
    );
    const pagesData = await pagesRes.json();

    if (!pagesData.data?.length) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/facebook?error=no_pages`,
      );
    }

    const page = pagesData.data[0];

    await adminDb
      .collection("socialAccounts")
      .doc(page.id)
      .set(
        {
          companyId,
          platform: "facebook",
          name: page.name,
          pageId: page.id,
          accessToken: page.access_token,
          connectedAt: new Date(),
          expiresAt: new Date(Date.now() + expiresIn * 1000),
        },
        { merge: true },
      );

    return NextResponse.redirect(`${baseUrl}/dashboard/facebook?success=true`);
  } catch (error) {
    console.error("FB callback error:", error);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/facebook?error=connection_failed`,
    );
  }
}
