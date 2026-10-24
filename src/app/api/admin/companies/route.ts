import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

async function assertSuperAdmin(uid: string) {
  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists || snap.data()?.isSuperAdmin !== true) {
    throw new Error("FORBIDDEN");
  }
}

export async function GET(req: NextRequest) {
  try {
    const uid = req.headers.get("x-user-uid");
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertSuperAdmin(uid);

    const snap = await adminDb
      .collection("companies")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get()
      .catch(async () => {
        // si no hay índice / createdAt, fallback
        return adminDb.collection("companies").limit(100).get();
      });

    const companies = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ companies });
  } catch (e: any) {
    if (e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
