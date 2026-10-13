import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const companyId = req.nextUrl.searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!code || !companyId || !appId || !appSecret) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/instagram?error=${!code ? "no_code" : "no_company"}`,
    );
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

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
    if (!tokenData.access_token) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/instagram?error=token_error`,
      );
    }

    let userToken = tokenData.access_token as string;

    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: userToken,
        }),
    );
    const longData = await longRes.json();
    userToken = longData.access_token || userToken;
    const expiresIn = longData.expires_in || 60 * 24 * 60 * 60;

    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${userToken}`,
    );
    const pagesData = await pagesRes.json();

    const page = pagesData.data?.find(
      (p: any) => p.instagram_business_account?.id,
    );
    if (!page) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/instagram?error=no_ig`,
      );
    }

    const ig = page.instagram_business_account;

    await adminDb
      .collection("socialAccounts")
      .doc(ig.id)
      .set(
        {
          companyId,
          platform: "instagram",
          igUserId: ig.id,
          username: ig.username || "",
          name: ig.username || page.name,
          pageId: page.id,
          accessToken: page.access_token,
          connectedAt: new Date(),
          expiresAt: new Date(Date.now() + expiresIn * 1000),
        },
        { merge: true },
      );

    return NextResponse.redirect(`${baseUrl}/dashboard/instagram?success=true`);
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/instagram?error=connection_failed`,
    );
  }
}
