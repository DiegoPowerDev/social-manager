import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { targetUid, companyId, requestedByUid } = await req.json();

    if (!targetUid || !companyId || !requestedByUid) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    if (targetUid === requestedByUid) {
      return NextResponse.json(
        { error: "No puedes eliminarte a ti mismo" },
        { status: 400 },
      );
    }

    const requester = await adminDb
      .collection("memberships")
      .doc(`${requestedByUid}_${companyId}`)
      .get();

    if (!requester.exists || requester.data()?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 1. Membership
    await adminDb
      .collection("memberships")
      .doc(`${targetUid}_${companyId}`)
      .delete();

    // 2. Perfil Firestore
    try {
      await adminDb.collection("users").doc(targetUid).delete();
    } catch {
      // ignore
    }

    // 3. Auth definitivo
    try {
      await getAuth().deleteUser(targetUid);
    } catch (e: any) {
      if (e.code !== "auth/user-not-found") throw e;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { error: error.message || "Error al eliminar" },
      { status: 500 },
    );
  }
}
