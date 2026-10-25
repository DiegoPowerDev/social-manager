import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const MUTABLE = ["editor", "viewer"] as const;

export async function POST(req: NextRequest) {
  try {
    const { targetUid, companyId, requestedByUid, role } = await req.json();

    if (!targetUid || !companyId || !requestedByUid || !role) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }
    if (!MUTABLE.includes(role)) {
      return NextResponse.json(
        { error: "Solo se puede asignar editor o viewer" },
        { status: 400 },
      );
    }
    if (targetUid === requestedByUid) {
      return NextResponse.json(
        { error: "No puedes cambiar tu propio rol" },
        { status: 400 },
      );
    }

    const requesterSnap = await adminDb
      .collection("memberships")
      .doc(`${requestedByUid}_${companyId}`)
      .get();

    if (!requesterSnap.exists || requesterSnap.data()?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const targetId = `${targetUid}_${companyId}`;
    const targetSnap = await adminDb
      .collection("memberships")
      .doc(targetId)
      .get();
    if (!targetSnap.exists) {
      return NextResponse.json(
        { error: "Miembro no encontrado" },
        { status: 404 },
      );
    }

    const current = targetSnap.data()?.role;
    if (current === "admin") {
      return NextResponse.json(
        { error: "No se puede cambiar el rol de un administrador" },
        { status: 400 },
      );
    }
    if (!MUTABLE.includes(current)) {
      return NextResponse.json(
        { error: "Rol actual no editable" },
        { status: 400 },
      );
    }

    await adminDb
      .collection("memberships")
      .doc(targetId)
      .set({ role, updatedAt: new Date() }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("update-role:", e);
    return NextResponse.json(
      { error: e.message || "Error al actualizar rol" },
      { status: 500 },
    );
  }
}
