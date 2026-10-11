import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb, FieldValue } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role, companyId, invitedByUid } =
      await req.json();

    if (!email || !password || !companyId || !invitedByUid) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 },
      );
    }

    const safeRole = role || "viewer";
    if (!["admin", "editor", "viewer"].includes(safeRole)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const inviterMembership = await adminDb
      .collection("memberships")
      .doc(`${invitedByUid}_${companyId}`)
      .get();

    if (
      !inviterMembership.exists ||
      inviterMembership.data()?.role !== "admin"
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const auth = getAuth();
    let userRecord;

    try {
      // Siempre cuenta nueva (1 usuario = 1 empresa)
      userRecord = await auth.createUser({
        email: email.trim().toLowerCase(),
        password,
        displayName: name || email,
      });
    } catch (e: any) {
      if (e.code === "auth/email-already-exists") {
        return NextResponse.json(
          {
            error:
              "Ese email ya está registrado. Si fue eliminado, espera unos segundos o usa otro email.",
          },
          { status: 409 },
        );
      }
      throw e;
    }

    const uid = userRecord.uid;
    const displayName = (name || email).trim();

    await adminDb.collection("users").doc(uid).set({
      email: email.trim().toLowerCase(),
      name: displayName,
      activeCompanyId: companyId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await adminDb.collection("memberships").doc(`${uid}_${companyId}`).set({
      uid,
      companyId,
      role: safeRole,
      email: email.trim().toLowerCase(),
      name: displayName,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, uid });
  } catch (error: any) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: error.message || "Error al invitar" },
      { status: 500 },
    );
  }
}
