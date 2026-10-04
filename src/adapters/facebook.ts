const GRAPH_API = "https://graph.facebook.com/v21.0";

export async function publishPost(
  pageId: string,
  pageAccessToken: string,
  data: {
    message?: string;
    link?: string;
    imageUrl?: string;
    videoUrl?: string;
  },
) {
  // Si hay imagen o video + link, agregamos el link al final del mensaje
  let finalMessage = data.message || "";

  if ((data.imageUrl || data.videoUrl) && data.link) {
    finalMessage = finalMessage ? `${finalMessage}\n\n${data.link}` : data.link;
  }

  // Caso 1: Publicar con imagen
  if (data.imageUrl) {
    const res = await fetch(`${GRAPH_API}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: data.imageUrl,
        caption: finalMessage,
        access_token: pageAccessToken,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error?.message || "Error al publicar la imagen");
    }
    return result;
  }

  // Caso 2: Publicar con video
  if (data.videoUrl) {
    const res = await fetch(`${GRAPH_API}/${pageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: data.videoUrl,
        description: finalMessage,
        access_token: pageAccessToken,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error?.message || "Error al publicar el video");
    }
    return result;
  }

  // Caso 3: Solo texto + link (sin imagen ni video)
  const body: any = {
    message: data.message || "",
    access_token: pageAccessToken,
  };

  if (data.link) {
    body.link = data.link;
  }

  const res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.error?.message || "Error al publicar el post");
  }

  return result;
}
