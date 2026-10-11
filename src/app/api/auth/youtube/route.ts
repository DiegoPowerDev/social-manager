import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const companyId = req.nextUrl.searchParams.get("companyId");

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

    const { clientId } = snap.data()!;
    const redirectUri = `${baseUrl}/api/auth/youtube/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline", // refresh_token
      prompt: "consent", // forzar refresh_token la 1ª vez
      state: companyId,
    });

    return NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    );
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${baseUrl}/youtube?error=auth_start`);
  }
}
