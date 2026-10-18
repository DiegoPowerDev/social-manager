async function getGoogleAccessToken(): Promise<string> {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error("Faltan FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY");
  }

  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) throw new Error("No access token from Google");
  return tokenResponse.token;
}

export async function findAuthUserByEmail(
  email: string,
): Promise<{ localId: string; email?: string } | null> {
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const accessToken = await getGoogleAccessToken();

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: [email] }),
    },
  );

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || "";
    if (msg.includes("USER_NOT_FOUND") || res.status === 404) return null;
    console.error("findAuthUserByEmail", data);
    return null;
  }

  const user = data.users?.[0];
  if (!user?.localId) return null;
  return { localId: user.localId, email: user.email };
}

export async function createAuthUser(options: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ localId: string }> {
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const accessToken = await getGoogleAccessToken();

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: options.email,
        password: options.password,
        displayName: options.displayName || undefined,
        emailVerified: true,
        disabled: false,
      }),
    },
  );

  const data = await res.json();
  if (!res.ok) {
    console.error("createAuthUser", data);
    throw new Error(data?.error?.message || "Error creating Auth user");
  }

  const localId =
    data.localId || data.userId || data.name?.split("/").pop() || null;
  if (!localId) throw new Error("No localId in create user response");
  return { localId };
}
