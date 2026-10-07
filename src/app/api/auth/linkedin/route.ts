import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`;

  const scopes = ["openid", "profile", "email", "w_member_social"].join(" ");

  const authUrl =
    `https://www.linkedin.com/oauth/v2/authorization?` +
    new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state: "linkedin_auth", // puedes hacerlo más seguro después
    });

  return NextResponse.redirect(authUrl);
}
