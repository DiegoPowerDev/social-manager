export async function publishToYouTube(options: {
  accessToken: string;
  title: string;
  description?: string;
  videoUrl: string;
  privacyStatus?: "public" | "unlisted" | "private";
}) {
  const {
    accessToken,
    title,
    description = "",
    videoUrl,
    privacyStatus = "public",
  } = options;

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error("No se pudo descargar el video desde R2");
  const buffer = Buffer.from(await videoRes.arrayBuffer());
  const contentType = videoRes.headers.get("content-type") || "video/mp4";

  // 1. Iniciar subida resumable
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Length": String(buffer.length),
        "X-Upload-Content-Type": contentType,
      },
      body: JSON.stringify({
        snippet: {
          title: title.slice(0, 100),
          description: description.slice(0, 5000),
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      }),
    },
  );

  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al iniciar subida a YouTube");
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube no devolvió URL de subida");

  // 2. Subir bytes
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
    },
    body: buffer,
  });

  const data = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(data.error?.message || "Error al subir el video");
  }

  const videoId = data.id as string;
  return {
    id: videoId,
    permalink: `https://www.youtube.com/watch?v=${videoId}`,
  };
}
