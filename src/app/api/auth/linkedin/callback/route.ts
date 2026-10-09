import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const companyId = req.nextUrl.searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/linkedin?error=no_code`);
  }
  if (!companyId) {
    return NextResponse.redirect(`${baseUrl}/linkedin?error=no_company`);
  }

  try {
    const snap = await adminDb
      .collection("platformCredentials")
      .doc(`${companyId}_linkedin`)
      .get();

    if (!snap.exists) {
      return NextResponse.redirect(`${baseUrl}/linkedin?error=no_credentials`);
    }

    const data = snap.data()!;
    const clientId = data.clientId || data.appId;
    const clientSecret = data.clientSecret || data.appSecret;
    const redirectUri = `${baseUrl}/api/auth/linkedin/callback`;

    const tokenRes = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      },
    );

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("LinkedIn token error:", tokenData);
      return NextResponse.redirect(`${baseUrl}/linkedin?error=token_error`);
    }

    const accessToken = tokenData.access_token as string;
    const expiresIn = (tokenData.expires_in as number) || 60 * 24 * 60 * 60;

    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();

    if (!profileRes.ok || !profile.sub) {
      console.error("LinkedIn profile error:", profile);
      return NextResponse.redirect(`${baseUrl}/linkedin?error=profile_error`);
    }

    const personId = profile.sub as string;
    const name =
      profile.name ||
      [profile.given_name, profile.family_name].filter(Boolean).join(" ") ||
      "LinkedIn User";

    await adminDb
      .collection("socialAccounts")
      .doc(personId)
      .set(
        {
          companyId,
          platform: "linkedin",
          personId,
          name,
          email: profile.email || null,
          accessToken,
          refreshToken: tokenData.refresh_token || null,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
          connectedAt: new Date(),
        },
        { merge: true },
      );

    return NextResponse.redirect(`${baseUrl}/linkedin?success=true`);
  } catch (error) {
    console.error("Error callback LinkedIn:", error);
    return NextResponse.redirect(`${baseUrl}/linkedin?error=connection_failed`);
  }
}
