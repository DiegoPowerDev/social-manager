import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const companyId = req.nextUrl.searchParams.get("companyId");
  const appId = process.env.META_APP_ID;

  if (!companyId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/facebook?error=no_company`,
    );
  }
  if (!appId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/facebook?error=no_credentials`,
    );
  }

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

  return NextResponse.redirect(
    `https://www.facebook.com/v21.0/dialog/oauth?${params}`,
  );
}
