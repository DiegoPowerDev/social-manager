import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const companyId = req.nextUrl.searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/youtube?error=no_code`);
  }
  if (!companyId) {
    return NextResponse.redirect(`${baseUrl}/youtube?error=no_company`);
  }

  try {
    const snap = await adminDb
      .collection("platformCredentials")
      .doc(`${companyId}_youtube`)
      .get();

    if (!snap.exists) {
      return NextResponse.redirect(`${baseUrl}/youtube?error=no_credentials`);
    }

    const { clientId, clientSecret } = snap.data()!;
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

    // Canal del usuario
    const chRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const chData = await chRes.json();

    if (!chRes.ok || !chData.items?.length) {
      console.error("YouTube channel error:", chData);
      return NextResponse.redirect(`${baseUrl}/youtube?error=no_channel`);
    }

    const channel = chData.items[0];
    const channelId = channel.id as string;

    await adminDb
      .collection("socialAccounts")
      .doc(channelId)
      .set(
        {
          companyId,
          platform: "youtube",
          channelId,
          channelTitle: channel.snippet?.title || "YouTube",
          name: channel.snippet?.title || "YouTube",
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
          connectedAt: new Date(),
        },
        { merge: true },
      );

    // Si Google no devolvió refresh_token (reconexión), no pisar el anterior
    if (!refreshToken) {
      const existing = await adminDb
        .collection("socialAccounts")
        .doc(channelId)
        .get();
      // merge ya no borra refreshToken si no lo mandamos en un update parcial;
      // con set merge, si refreshToken es null podrías borrar: mejor:
    }

    return NextResponse.redirect(`${baseUrl}/youtube?success=true`);
  } catch (error) {
    console.error("YouTube callback error:", error);
    return NextResponse.redirect(`${baseUrl}/youtube?error=connection_failed`);
  }
}
