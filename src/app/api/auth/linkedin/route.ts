import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const companyId = req.nextUrl.searchParams.get("companyId");
  const clientId = process.env.LINKEDIN_CLIENT_ID;

  if (!companyId) {
    return NextResponse.redirect(`${baseUrl}/linkedin?error=no_company`);
  }
  if (!clientId) {
    return NextResponse.redirect(`${baseUrl}/linkedin?error=no_credentials`);
  }

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
}
