// lib/media.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function saveMediaToLibrary(params: {
  companyId: string;
  uid: string;
  url: string;
  key?: string;
  fileName: string;
  size: number;
  mimeType: string;
  source?: "upload" | "ai" | "import";
}) {
  const type = params.mimeType.startsWith("video/") ? "video" : "image";

  await addDoc(collection(db, "media"), {
    companyId: params.companyId,
    url: params.url,
    key: params.key || null,
    type,
    fileName: params.fileName,
    size: params.size,
    mimeType: params.mimeType,
    createdAt: serverTimestamp(),
    createdBy: params.uid,
    source: params.source || "upload",
  });
}
