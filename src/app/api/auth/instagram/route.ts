import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const companyId = req.nextUrl.searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.redirect(`${baseUrl}/instagram?error=no_company`);
  }

  try {
    const credRef = adminDb
      .collection("platformCredentials")
      .doc(`${companyId}_instagram`);
    const credentialsSnap = await credRef.get();

    if (!credentialsSnap.exists) {
      return NextResponse.redirect(`${baseUrl}/instagram?error=no_credentials`);
    }

    const { appId } = credentialsSnap.data()!;
    const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

    // OAuth clásico (sin config_id fijo de otra app)
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state: companyId, // se recupera en el callback
      response_type: "code",
      scope: [
        "instagram_basic",
        "instagram_content_publish",
        "pages_show_list",
        "pages_read_engagement",
        "business_management",
      ].join(","),
    });

    // Si usas Facebook Login for Business con config_id de ESA app:
    // params.set("config_id", process.env.META_IG_CONFIG_ID || "");

    const url = `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Error iniciando auth de Instagram:", error);
    return NextResponse.redirect(`${baseUrl}/instagram?error=auth_start`);
  }
}
