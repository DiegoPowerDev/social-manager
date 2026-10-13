import { GoogleGenerativeAI } from "@google/generative-ai";
import { fal } from "@fal-ai/client";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateCaption(options: {
  topic: string;
  platform?: "facebook" | "instagram" | "general";
  tone?: string;
  language?: string;
  brandInstructions?: string;
}) {
  const {
    topic,
    platform = "general",
    tone = "profesional y cercano",
    language = "español",
    brandInstructions = "",
  } = options;

  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
  });
  const brandBlock = brandInstructions
    ? `\nInstrucciones de marca (obligatorias):\n${brandInstructions}\n`
    : "";

  const prompt = `
Eres un experto en copywriting para redes sociales.
${brandBlock}
Genera un caption atractivo para ${platform} sobre el siguiente tema:
"${topic}"

Requisitos:
- Idioma: ${language}
- Tono: ${tone}
- Longitud ideal: entre 100 y 220 caracteres (puede ser un poco más si es necesario)
- Incluye emojis de forma natural
- Incluye 3 a 6 hashtags relevantes al final
- Que invite a la interacción (pregunta o llamado a la acción sutil)

Devuelve solo el caption final, sin explicaciones ni comillas.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  return text.trim();
}

fal.config({
  credentials: process.env.FAL_KEY,
});

export async function generateImage(options: {
  prompt: string;
  imageUrl?: string;
  imageUrls?: string[];
}) {
  const { prompt } = options;

  const refs = options.imageUrls?.length
    ? options.imageUrls
    : options.imageUrl
      ? [options.imageUrl]
      : [];

  // ===== EDICIÓN / multi-referencia con Nano Banana =====
  if (refs.length > 0) {
    const result = await fal.subscribe("fal-ai/nano-banana-2.1/edit", {
      input: {
        prompt: prompt.trim(),
        image_urls: refs, // 1..N referencias
        num_images: 1,
        aspect_ratio: "auto",
        output_format: "jpeg",
        resolution: "1K",
        safety_tolerance: "4",
      },
    });

    return result.data.images[0].url;
  }

  // ===== GENERACIÓN desde cero =====
  const result = await fal.subscribe("fal-ai/nano-banana-2.1", {
    input: {
      prompt: prompt.trim(),
      num_images: 1,
      aspect_ratio: "1:1",
      output_format: "jpeg",
      resolution: "1K",
      safety_tolerance: "4",
    },
  });

  return result.data.images[0].url;
}
