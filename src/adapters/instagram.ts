const GRAPH_API = "https://graph.facebook.com/v21.0";

async function waitForContainer(
  containerId: string,
  accessToken: string,
  maxAttempts = 40,
) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${GRAPH_API}/${containerId}?fields=status_code,status&access_token=${accessToken}`,
    );
    const data = await res.json();

    if (data.status_code === "FINISHED") return true;
    if (data.status_code === "ERROR") {
      throw new Error(data.status || "Instagram no pudo procesar el media");
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error("Timeout esperando que Instagram procese el media");
}

export async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  data: {
    caption?: string;
    imageUrl?: string;
    imageUrls?: string[];
    videoUrl?: string;
    mediaType?: "FEED" | "REELS" | "STORIES" | "CAROUSEL";
  },
) {
  const mediaType = data.mediaType || "FEED";
  let containerId: string;

  // ========== CARRUSEL (2–10 imágenes) ==========
  if (mediaType === "CAROUSEL") {
    const urls = (
      data.imageUrls?.length
        ? data.imageUrls
        : data.imageUrl
          ? [data.imageUrl]
          : []
    ).filter(Boolean);

    if (urls.length < 2) {
      throw new Error("El carrusel requiere al menos 2 imágenes");
    }
    if (urls.length > 10) {
      throw new Error("El carrusel admite máximo 10 imágenes");
    }

    const childIds: string[] = [];

    for (const imageUrl of urls) {
      const res = await fetch(`${GRAPH_API}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          is_carousel_item: true,
          access_token: accessToken,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error?.message || "Error al crear ítem del carrusel",
        );
      }
      childIds.push(json.id);
    }

    const parentRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "CAROUSEL",
        children: childIds.join(","),
        caption: data.caption || "",
        access_token: accessToken,
      }),
    });
    const parentJson = await parentRes.json();
    if (!parentRes.ok) {
      throw new Error(
        parentJson.error?.message || "Error al crear el carrusel",
      );
    }
    containerId = parentJson.id;
  }

  // ========== HISTORIA ==========
  else if (mediaType === "STORIES") {
    if (data.imageUrl) {
      const res = await fetch(`${GRAPH_API}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "STORIES",
          image_url: data.imageUrl,
          access_token: accessToken,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json.error?.message || "Error al crear historia (imagen)",
        );
      containerId = json.id;
    } else if (data.videoUrl) {
      const res = await fetch(`${GRAPH_API}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "STORIES",
          video_url: data.videoUrl,
          access_token: accessToken,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json.error?.message || "Error al crear historia (video)",
        );
      containerId = json.id;
    } else {
      throw new Error("Las historias requieren una imagen o un video");
    }
  }

  // ========== REEL ==========
  else if (mediaType === "REELS") {
    if (!data.videoUrl) {
      throw new Error("Los Reels requieren un video");
    }

    const res = await fetch(`${GRAPH_API}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: data.videoUrl,
        caption: data.caption || "",
        access_token: accessToken,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Error al crear Reel");
    containerId = json.id;
  }

  // ========== FEED ==========
  else {
    if (data.imageUrl) {
      const res = await fetch(`${GRAPH_API}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: data.imageUrl,
          caption: data.caption || "",
          access_token: accessToken,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json.error?.message || "Error al crear publicación (imagen)",
        );
      containerId = json.id;
    } else if (data.videoUrl) {
      const res = await fetch(`${GRAPH_API}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "REELS",
          video_url: data.videoUrl,
          caption: data.caption || "",
          access_token: accessToken,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json.error?.message || "Error al crear publicación (video)",
        );
      containerId = json.id;
    } else {
      throw new Error("Instagram requiere una imagen o un video");
    }
  }

  await waitForContainer(containerId, accessToken);

  const publishRes = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: accessToken,
    }),
  });

  const publishData = await publishRes.json();
  if (!publishRes.ok) {
    throw new Error(
      publishData.error?.message || "Error al publicar en Instagram",
    );
  }

  const mediaId = publishData.id as string;
  let permalink: string | null = null;

  if (mediaType !== "STORIES") {
    try {
      const infoRes = await fetch(
        `${GRAPH_API}/${mediaId}?fields=permalink,shortcode&access_token=${accessToken}`,
      );
      const info = await infoRes.json();
      permalink = info.permalink || null;
      if (!permalink && info.shortcode) {
        const path = mediaType === "REELS" ? "reel" : "p";
        permalink = `https://www.instagram.com/${path}/${info.shortcode}/`;
      }
    } catch {
      // no bloquear
    }
  }

  return { id: mediaId, permalink };
}
