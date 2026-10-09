import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const companyId = req.nextUrl.searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/facebook?error=no_code`);
  }
  if (!companyId) {
    return NextResponse.redirect(`${baseUrl}/facebook?error=no_company`);
  }

  try {
    const credentialsSnap = await adminDb
      .collection("platformCredentials")
      .doc(`${companyId}_facebook`)
      .get();

    if (!credentialsSnap.exists) {
      return NextResponse.redirect(`${baseUrl}/facebook?error=no_credentials`);
    }

    const { appId, appSecret } = credentialsSnap.data()!;
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
      console.error("Error obteniendo token:", tokenData.error);
      return NextResponse.redirect(`${baseUrl}/facebook?error=token_error`);
    }

    const userAccessToken = tokenData.access_token as string;

    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`,
    );
    const pagesData = await pagesRes.json();

    if (!pagesData.data?.length) {
      return NextResponse.redirect(`${baseUrl}/facebook?error=no_pages`);
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
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
        { merge: true },
      );

    return NextResponse.redirect(`${baseUrl}/facebook?success=true`);
  } catch (error) {
    console.error("Error en callback de Facebook:", error);
    return NextResponse.redirect(`${baseUrl}/facebook?error=connection_failed`);
  }
}
