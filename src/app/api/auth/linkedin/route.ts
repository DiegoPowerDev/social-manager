import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const companyId = req.nextUrl.searchParams.get("companyId");

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
    const redirectUri = `${baseUrl}/api/auth/linkedin/callback`;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state: companyId,
      scope: "openid profile email w_member_social",
    });

    return NextResponse.redirect(
      `https://www.linkedin.com/oauth/v2/authorization?${params}`,
    );
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${baseUrl}/linkedin?error=auth_start`);
  }
}
