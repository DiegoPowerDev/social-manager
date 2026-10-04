const GRAPH_API = "https://graph.facebook.com/v21.0";

async function waitForContainer(
  containerId: string,
  accessToken: string,
  maxAttempts = 30, // ← aumentamos a 30 intentos (≈ 90 segundos)
) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${GRAPH_API}/${containerId}?fields=status_code,status&access_token=${accessToken}`,
    );
    const data = await res.json();

    console.log(`Intento ${i + 1}:`, data.status_code, data.status);

    if (data.status_code === "FINISHED") {
      return true;
    }

    if (data.status_code === "ERROR") {
      throw new Error(data.status || "Instagram no pudo procesar el media");
    }

    // Esperar 3 segundos
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
  },
) {
  let containerId: string;

  if (data.imageUrl) {
    const containerRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: data.imageUrl,
        caption: data.caption || "",
        access_token: accessToken,
      }),
    });

    const containerData = await containerRes.json();
    if (!containerRes.ok) {
      throw new Error(
        containerData.error?.message || "Error al crear contenedor de imagen",
      );
    }
    containerId = containerData.id;
  } else if (data.videoUrl) {
    const containerRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: data.videoUrl,
        caption: data.caption || "",
        access_token: accessToken,
      }),
    });

    const containerData = await containerRes.json();
    if (!containerRes.ok) {
      throw new Error(
        containerData.error?.message || "Error al crear contenedor de video",
      );
    }
    containerId = containerData.id;
  } else {
    throw new Error("Instagram requiere una imagen o un video");
  }

  // Esperar a que Instagram termine de procesar
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
