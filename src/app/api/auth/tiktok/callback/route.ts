import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getTikTokUserInfo } from "@/adapters/tiktok";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const companyId = req.nextUrl.searchParams.get("state");
  const err = req.nextUrl.searchParams.get("error");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (err) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/tiktok?error=${encodeURIComponent(err)}`,
    );
  }
  if (!code) {
    return NextResponse.redirect(`${baseUrl}/dashboard/tiktok?error=no_code`);
  }
  if (!companyId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/tiktok?error=no_company`,
    );
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/tiktok?error=no_credentials`,
    );
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;

    const tokenRes = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      },
    );

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("TikTok token error:", tokenData);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/tiktok?error=token_error`,
      );
    }

    const accessToken = tokenData.access_token as string;
    const refreshToken = tokenData.refresh_token as string | undefined;
    const expiresIn = Number(tokenData.expires_in || 86400);
    const openId = tokenData.open_id as string;

    let displayName = openId;
    let avatarUrl: string | null = null;
    let username: string | null = null;

    try {
      const user = await getTikTokUserInfo(accessToken);
      displayName = user.display_name || displayName;
      avatarUrl = user.avatar_url || null;
      username = user.username || null;
    } catch (e) {
      console.warn("TikTok user info:", e);
    }

    // Doc id estable por empresa + open_id
    const docId = `${companyId}_tiktok_${openId}`;

    await adminDb
      .collection("socialAccounts")
      .doc(docId)
      .set(
        {
          companyId,
          platform: "tiktok",
          openId,
          name: displayName,
          username: username || null,
          avatarUrl,
          accessToken,
          refreshToken: refreshToken || null,
          connectedAt: new Date(),
          expiresAt: new Date(Date.now() + expiresIn * 1000),
        },
        { merge: true },
      );

    return NextResponse.redirect(`${baseUrl}/dashboard/tiktok?success=true`);
  } catch (e) {
    console.error("TikTok callback error:", e);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/tiktok?error=connection_failed`,
    );
  }
}
