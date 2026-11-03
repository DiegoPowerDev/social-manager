/** Ratios que suele aceptar Gemini imageConfig */
export function ratioToGeminiAspect(w: number, h: number): string {
  if (!w || !h) return "1:1";
  const r = w / h;
  // de más ancho a más alto
  if (r >= 2.0) return "21:9";
  if (r >= 1.6) return "16:9";
  if (r >= 1.35) return "3:2";
  if (r >= 1.15) return "4:3";
  if (r >= 0.95) return "1:1";
  if (r >= 0.8) return "4:5";
  if (r >= 0.7) return "3:4";
  if (r >= 0.55) return "2:3";
  return "9:16";
}

export function getImageDimensions(
  src: string | File,
): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    img.onload = () => {
      if (typeof src !== "string") URL.revokeObjectURL(url);
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      if (typeof src !== "string") URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}
