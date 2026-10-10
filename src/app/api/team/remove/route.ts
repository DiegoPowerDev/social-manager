import { NextRequest, NextResponse } from "next/server";
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

    await adminDb
      .collection("memberships")
      .doc(`${targetUid}_${companyId}`)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al eliminar" },
      { status: 500 },
    );
  }
}
