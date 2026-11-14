import { GoogleGenerativeAI } from "@google/generative-ai";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const CAPTION_MODEL =
  process.env.GEMINI_CAPTION_MODEL || "gemini-3.1-flash-lite";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1";

export type CaptionLength = "short" | "medium" | "long";

const LENGTH_RULES: Record<CaptionLength, string> = {
  short: "Longitud: corta, máximo ~100–220 caracteres.",
  medium: "Longitud: media, entre 220 y 450 caracteres.",
  long: "Longitud: larga, entre 450 y 700 caracteres (sin relleno vacío).",
};

export async function generateCaption(options: {
  topic: string;
  platform?: "facebook" | "instagram" | "general";
  tone?: string;
  language?: string;
  brandInstructions?: string;
  length?: CaptionLength;
  includeHashtags?: boolean;
  includeEmojis?: boolean;
}) {
  const {
    topic,
    platform = "general",
    tone = "profesional y cercano",
    language = "español",
    brandInstructions = "",
    length = "medium",
    includeHashtags = true,
    includeEmojis = true,
  } = options;

  const model = genAI.getGenerativeModel({ model: CAPTION_MODEL });

  const brandBlock = brandInstructions
    ? `\nInstrucciones de marca (obligatorias):\n${brandInstructions}\n`
    : "";

  const lengthRule = LENGTH_RULES[length] || LENGTH_RULES.medium;
  const emojiRule = includeEmojis
    ? "- Incluye emojis de forma natural."
    : "- No uses emojis.";
  const hashtagRule = includeHashtags
    ? "- Incluye 3 a 6 hashtags relevantes al final."
    : "- No incluyas hashtags.";

  const prompt = `
Eres un experto en copywriting para redes sociales.
${brandBlock}
Genera un caption atractivo para ${platform} sobre el siguiente tema:
"${topic}"

Requisitos:
- Idioma: ${language}
- Tono: ${tone}
- ${lengthRule}
${emojiRule}
${hashtagRule}
- Que invite a la interacción (pregunta o llamado a la acción sutil)

Devuelve solo el caption final, sin explicaciones ni comillas.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

async function fetchImageAsInlinePart(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo descargar la imagen de referencia: ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const mimeType = contentType.split(";")[0].trim();
  return {
    inlineData: {
      mimeType,
      data: buf.toString("base64"),
    },
  };
}

async function uploadBase64ToR2(
  base64: string,
  mimeType: string,
): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return `data:${mimeType};base64,${base64}`;
  }

  const ext = mimeType.includes("png")
    ? "png"
    : mimeType.includes("webp")
      ? "webp"
      : "jpg";
  const key = `ai-generated/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(base64, "base64"),
      ContentType: mimeType,
    }),
  );

  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

/** Detecta bloqueos de seguridad de Gemini (HTTP o respuesta sin imagen). */
export function isGeminiSafetyError(err: unknown, data?: any): boolean {
  const msg = (
    err instanceof Error ? err.message : String(err || "")
  ).toLowerCase();
  if (
    msg.includes("safety") ||
    msg.includes("blocked") ||
    msg.includes("policy") ||
    msg.includes("prohibited") ||
    msg.includes("responsible ai")
  ) {
    return true;
  }
  const br = data?.promptFeedback?.blockReason || data?.error?.status;
  if (br && String(br).toUpperCase().includes("SAFETY")) return true;
  const fr = data?.candidates?.[0]?.finishReason;
  if (fr && String(fr).toUpperCase().includes("SAFETY")) return true;
  return false;
}

export class AiSafetyError extends Error {
  code = "AI_SAFETY" as const;
  constructor(message?: string) {
    super(
      message ||
        "El prompt no cumple las políticas de contenido. No generes menores ni contenido sexual.",
    );
    this.name = "AiSafetyError";
  }
}

export async function generateImage(options: {
  prompt: string;
  imageUrl?: string;
  imageUrls?: string[];
  aspectRatio?: string;
  imageSize?: "1K" | "2K";
}) {
  const prompt = options.prompt.trim();
  if (!prompt) throw new Error("Prompt vacío");

  const refs = options.imageUrls?.length
    ? options.imageUrls
    : options.imageUrl
      ? [options.imageUrl]
      : [];

  const limitedRefs = refs.slice(0, 3);
  const aspectRatio =
    options.aspectRatio || (limitedRefs.length ? "16:9" : "1:1");
  const imageSize = options.imageSize || "1K";

  const parts: any[] = [{ text: prompt }];
  for (const url of limitedRefs) {
    parts.push(await fetchImageAsInlinePart(url));
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: aspectRatio || "1:1",
        imageSize: imageSize || "1K",
      },
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    if (isGeminiSafetyError(null, data)) {
      throw new AiSafetyError(data?.error?.message);
    }
    const msg =
      data?.error?.message ||
      data?.message ||
      `Gemini image error (${res.status})`;
    throw new Error(msg);
  }

  if (isGeminiSafetyError(null, data)) {
    throw new AiSafetyError();
  }

  const responseParts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find(
    (p: any) => p.inlineData?.data || p.inline_data?.data,
  );

  if (!imagePart) {
    const textPart = responseParts.find((p: any) => p.text)?.text;
    if (isGeminiSafetyError(textPart || "", data)) {
      throw new AiSafetyError(textPart);
    }
    throw new Error(
      textPart
        ? `Gemini no devolvió imagen: ${textPart.slice(0, 200)}`
        : "Gemini no devolvió imagen",
    );
  }

  const inline = imagePart.inlineData || imagePart.inline_data;
  const mimeType = inline.mimeType || inline.mime_type || "image/png";
  const base64 = inline.data as string;

  return uploadBase64ToR2(base64, mimeType);
}
