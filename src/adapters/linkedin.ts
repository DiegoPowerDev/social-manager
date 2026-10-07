const LINKEDIN_API = "https://api.linkedin.com";

export async function publishToLinkedIn(options: {
  accessToken: string;
  personId: string;
  text: string;
  imageUrl?: string;
}) {
  const { accessToken, personId, text, imageUrl } = options;
  const author = `urn:li:person:${personId}`;

  // ===== SOLO TEXTO =====
  if (!imageUrl) {
    const res = await fetch(`${LINKEDIN_API}/v2/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text,
            },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data.message || data.error?.message || "Error al publicar en LinkedIn",
      );
    }
    return data;
  }

  // ===== TEXTO + IMAGEN =====
  // 1. Registrar la subida de la imagen
  const registerRes = await fetch(
    `${LINKEDIN_API}/v2/assets?action=registerUpload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: author,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      }),
    },
  );

  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(
      registerData.message || "Error al registrar imagen en LinkedIn",
    );
  }

  const uploadUrl =
    registerData.value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ].uploadUrl;
  const asset = registerData.value.asset; // urn:li:digitalmediaAsset:...

  // 2. Descargar la imagen desde R2 y subirla a LinkedIn
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error("No se pudo descargar la imagen");
  const imageBuffer = await imageRes.arrayBuffer();

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error("Error al subir la imagen a LinkedIn");
  }

  // 3. Crear el post con la imagen
  const postRes = await fetch(`${LINKEDIN_API}/v2/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text,
          },
          shareMediaCategory: "IMAGE",
          media: [
            {
              status: "READY",
              media: asset,
            },
          ],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  const postData = await postRes.json().catch(() => ({}));
  if (!postRes.ok) {
    throw new Error(
      postData.message ||
        postData.error?.message ||
        "Error al publicar en LinkedIn",
    );
  }

  return postData;
}
