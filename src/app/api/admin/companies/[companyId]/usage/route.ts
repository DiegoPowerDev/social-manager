import { NextRequest, NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase-admin";

async function assertSuperAdmin(uid: string) {
  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists || snap.data()?.isSuperAdmin !== true) {
    throw new Error("FORBIDDEN");
  }
}

type Ctx = { params: Promise<{ companyId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const uid = req.headers.get("x-user-uid");
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertSuperAdmin(uid);

    const { companyId } = await ctx.params;
    const body = await req.json();

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const ref = adminDb
      .collection("companies")
      .doc(companyId)
      .collection("usage")
      .doc(period);

    if (body.reset === true) {
      await ref.set(
        {
          aiCaptions: 0,
          aiImages: 0,
          period,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      await ref.set(
        {
          aiCaptions: Number(body.aiCaptions ?? 0),
          aiImages: Number(body.aiImages ?? 0),
          period,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return NextResponse.json({ success: true, period });
  } catch (e: any) {
    if (e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
