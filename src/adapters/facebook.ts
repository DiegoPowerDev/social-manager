const GRAPH_API = "https://graph.facebook.com/v21.0";

export async function publishTextPost(
  pageId: string,
  pageAccessToken: string,
  message: string,
) {
  const res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      access_token: pageAccessToken,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || "Error al publicar en Facebook");
  }

  return data; // { id: "pageid_postid" }
}
