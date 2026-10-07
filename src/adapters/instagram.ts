const GRAPH_API = "https://graph.facebook.com/v21.0";

async function waitForContainer(
  containerId: string,
  accessToken: string,
  maxAttempts = 30,
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
    videoUrl?: string;
    mediaType?: "FEED" | "REELS" | "STORIES";
  },
) {
  const mediaType = data.mediaType || "FEED";
  let containerId: string;

  // ========== HISTORIA ==========
  if (mediaType === "STORIES") {
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

  // ========== FEED (publicación normal) ==========
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
      // Video en feed también se publica como REELS actualmente
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

  // Esperar procesamiento
  await waitForContainer(containerId, accessToken);

  // Publicar
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

  return publishData;
}
