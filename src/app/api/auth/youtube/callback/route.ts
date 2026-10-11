import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const companyId = req.nextUrl.searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/youtube?error=no_code`);
  }
  if (!companyId) {
    return NextResponse.redirect(`${baseUrl}/youtube?error=no_company`);
  }
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/youtube?error=no_credentials`);
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/youtube/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("YouTube token error:", tokenData);
      return NextResponse.redirect(`${baseUrl}/youtube?error=token_error`);
    }

    const accessToken = tokenData.access_token as string;
    const refreshToken = (tokenData.refresh_token as string) || null;
    const expiresIn = (tokenData.expires_in as number) || 3600;

    const chRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const chData = await chRes.json();

    if (!chRes.ok || !chData.items?.length) {
      console.error("YouTube channel error:", chData);
      return NextResponse.redirect(`${baseUrl}/youtube?error=no_channel`);
    }

    const channel = chData.items[0];
    const channelId = channel.id as string;

    const payload: Record<string, unknown> = {
      companyId,
      platform: "youtube",
      channelId,
      channelTitle: channel.snippet?.title || "YouTube",
      name: channel.snippet?.title || "YouTube",
      accessToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      connectedAt: new Date(),
    };
    if (refreshToken) {
      payload.refreshToken = refreshToken;
    }

    await adminDb
      .collection("socialAccounts")
      .doc(channelId)
      .set(payload, { merge: true });

    return NextResponse.redirect(`${baseUrl}/youtube?success=true`);
  } catch (error) {
    console.error("YouTube callback error:", error);
    return NextResponse.redirect(`${baseUrl}/youtube?error=connection_failed`);
  }
}
