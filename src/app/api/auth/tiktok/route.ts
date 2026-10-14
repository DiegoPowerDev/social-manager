import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const clientKey = process.env.TIKTOK_CLIENT_KEY;

  if (!companyId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/tiktok?error=no_company`,
    );
  }
  if (!clientKey) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/tiktok?error=no_credentials`,
    );
  }

  const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;
  const scope = ["user.info.basic", "user.info.profile", "video.publish"].join(
    ",",
  );

  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope,
    redirect_uri: redirectUri,
    state: companyId,
  });

  return NextResponse.redirect(
    `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`,
  );
}
