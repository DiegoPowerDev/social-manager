const GRAPH_API = "https://graph.facebook.com/v21.0";

export async function publishTextPost(
  pageId: string,
  pageAccessToken: string,
  message: string,
  link?: string,
) {
  const body: any = {
    message,
    access_token: pageAccessToken,
  };

  // Si hay link, lo agregamos
  if (link && link.trim() !== "") {
    body.link = link.trim();
  }

  const res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || "Error al publicar en Facebook");
  }

  return data;
}
