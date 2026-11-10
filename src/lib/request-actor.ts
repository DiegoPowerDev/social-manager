import { adminDb } from "@/lib/firebase-admin";

export type RequestActor = {
  uid: string;
  name: string | null;
  email: string | null;
};

export async function getActorByUid(uid: string): Promise<RequestActor> {
  const snap = await adminDb.collection("users").doc(uid).get();
  const d = snap.data();
  return {
    uid,
    name: (d?.name || d?.displayName || null) as string | null,
    email: (d?.email || null) as string | null,
  };
}
