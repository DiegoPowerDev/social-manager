import { adminDb } from "@/lib/firebase-admin";

export async function getValidYouTubeAccessToken(options: {
  companyId: string;
  accountDocId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | string | null;
}) {
  const { companyId, accountDocId, refreshToken } = options;
  let accessToken = options.accessToken;

  const expiresAt = options.expiresAt
    ? new Date(options.expiresAt).getTime()
    : 0;
  const stillValid = expiresAt > Date.now() + 60_000; // 1 min margen

  if (stillValid) return accessToken;
  if (!refreshToken) {
    throw new Error("TOKEN_EXPIRED");
  }

  const credSnap = await adminDb
    .collection("platformCredentials")
    .doc(`${companyId}_youtube`)
    .get();
  if (!credSnap.exists) throw new Error("No hay credenciales de YouTube");

  const { clientId, clientSecret } = credSnap.data()!;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error("TOKEN_EXPIRED");
  }

  accessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in || 3600;

  await adminDb
    .collection("socialAccounts")
    .doc(accountDocId)
    .set(
      {
        accessToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
      { merge: true },
    );

  return accessToken;
}
