import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const companyId = req.nextUrl.searchParams.get("companyId");

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

    const { appId } = credentialsSnap.data()!;
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state: companyId,
      response_type: "code",
      scope: [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "business_management",
      ].join(","),
    });

    // Si usas Login for Business con config_id de ESA app:
    // params.set("config_id", "TU_CONFIG_ID");

    const url = `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Error iniciando auth de Facebook:", error);
    return NextResponse.redirect(`${baseUrl}/facebook?error=auth_start`);
  }
}
