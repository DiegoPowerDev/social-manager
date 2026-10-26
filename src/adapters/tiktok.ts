const TIKTOK_API = "https://open.tiktokapis.com";

export async function getTikTokUserInfo(accessToken: string) {
  // Solo campos de user.info.basic (sin depender de user.info.profile)
  const res = await fetch(
    `${TIKTOK_API}/v2/user/info/?fields=open_id,union_id,avatar_url,display_name`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const json = await res.json();
  if (json.error?.code && json.error.code !== "ok") {
    throw new Error(json.error?.message || "Error user info TikTok");
  }
  return json.data?.user as {
    open_id: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export async function queryCreatorInfo(accessToken: string) {
  const res = await fetch(`${TIKTOK_API}/v2/post/publish/creator_info/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
  });
  const json = await res.json();
  if (json.error?.code && json.error.code !== "ok") {
    throw new Error(json.error?.message || "Error creator_info");
  }
  return json.data as {
    privacy_level_options?: string[];
    max_video_post_duration_sec?: number;
  };
}

/**
 * Direct Post + PULL_FROM_URL.
 * El nivel de privacidad real lo marca creator_info (hasta el audit: suele ser solo SELF_ONLY).
 */
export async function publishToTikTok(options: {
  accessToken: string;
  title: string;
  videoUrl: string;
  privacyLevel?: string;
}) {
  const { accessToken, title, videoUrl } = options;

  const creator = await queryCreatorInfo(accessToken);
  const allowed = creator.privacy_level_options?.length
    ? creator.privacy_level_options
    : ["SELF_ONLY"];

  // Preferencia: la que pide el cliente → pública → primera permitida
  const preferred = options.privacyLevel;
  let privacyLevel: string;
  if (preferred && allowed.includes(preferred)) {
    privacyLevel = preferred;
  } else if (allowed.includes("PUBLIC_TO_EVERYONE")) {
    privacyLevel = "PUBLIC_TO_EVERYONE";
  } else {
    privacyLevel = allowed[0];
  }

  const initRes = await fetch(`${TIKTOK_API}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: title.slice(0, 2200),
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    }),
  });

  const initJson = await initRes.json();
  if (initJson.error?.code && initJson.error.code !== "ok") {
    throw new Error(
      initJson.error?.message ||
        initJson.error?.code ||
        "Error al iniciar publicación TikTok",
    );
  }

  const publishId = initJson.data?.publish_id as string;

  let status = "PROCESSING";
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const stRes = await fetch(`${TIKTOK_API}/v2/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const stJson = await stRes.json();
    status = stJson.data?.status || status;
    if (status === "PUBLISH_COMPLETE" || status === "FAILED") break;
  }

  if (status === "FAILED") {
    throw new Error("TikTok no pudo procesar el video");
  }

  return { publishId, status, privacyLevel };
}

export async function refreshTikTokToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    client_secret: process.env.TIKTOK_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(`${TIKTOK_API}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  if (json.error || !json.access_token) {
    throw new Error(
      json.error_description || json.error || "Error refresh TikTok",
    );
  }
  return json;
}
