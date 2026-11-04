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
  privacyLevel: string;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  /** true = branded content (tercero) */
  brandContentToggle?: boolean;
  /** true = your brand */
  brandOrganicToggle?: boolean;
}) {
  const {
    accessToken,
    title,
    videoUrl,
    privacyLevel,
    disableComment = false,
    disableDuet = false,
    disableStitch = false,
    brandContentToggle = false,
    brandOrganicToggle = false,
  } = options;

  const initRes = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: title.slice(0, 2200),
          privacy_level: privacyLevel,
          disable_comment: disableComment,
          disable_duet: disableDuet,
          disable_stitch: disableStitch,
          brand_content_toggle: brandContentToggle,
          brand_organic_toggle: brandOrganicToggle,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: videoUrl,
        },
      }),
    },
  );

  const initData = await initRes.json();
  if (!initRes.ok || initData?.error?.code !== "ok") {
    throw new Error(
      initData?.error?.message ||
        initData?.error?.code ||
        "Error al iniciar publicación en TikTok",
    );
  }

  const publishId = initData?.data?.publish_id as string;

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

  return {
    publishId,
    status: initData?.data?.publish_id ? "processing" : "published",
  };
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
