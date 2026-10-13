import { NextRequest, NextResponse } from "next/server";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const companyId = req.nextUrl.searchParams.get("companyId");
  const clientId = process.env.YOUTUBE_CLIENT_ID;

  if (!companyId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/youtube?error=no_company`,
    );
  }
  if (!clientId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/youtube?error=no_credentials`,
    );
  }

  const redirectUri = `${baseUrl}/api/auth/youtube/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: companyId,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  );
}
