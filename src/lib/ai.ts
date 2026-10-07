import { GoogleGenerativeAI } from "@google/generative-ai";
import { fal } from "@fal-ai/client";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateCaption(options: {
  topic: string;
  platform?: "facebook" | "instagram" | "general";
  tone?: string;
  language?: string;
}) {
  const {
    topic,
    platform = "general",
    tone = "profesional y cercano",
    language = "español",
  } = options;

  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
  });

  const prompt = `
Eres un experto en copywriting para redes sociales.

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
}) {
  const { prompt, imageUrl } = options;

  // Si hay imagen de referencia → usamos FLUX Kontext (mucho mejor para editar)
  if (imageUrl) {
    const result = await fal.subscribe("fal-ai/flux-pro/kontext", {
      input: {
        prompt: prompt,
        image_url: imageUrl,
        guidance_scale: 3.5,
        num_images: 1,
        output_format: "jpeg",
        safety_tolerance: "2",
      },
    });

    return result.data.images[0].url;
  }

  // Generación desde cero (sigue usando flux/dev)
  const result = await fal.subscribe("fal-ai/flux/dev", {
    input: {
      prompt,
      image_size: "square_hd",
      num_images: 1,
      output_format: "jpeg",
    },
  });

  return result.data.images[0].url;
}
