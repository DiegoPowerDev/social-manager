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

    if (!["admin", "editor", "viewer"].includes(role || "viewer")) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    // Verificar que quien invita es admin de esa empresa
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
      userRecord = await auth.createUser({
        email,
        password,
        displayName: name || email,
      });
    } catch (e: any) {
      if (e.code === "auth/email-already-exists") {
        userRecord = await auth.getUserByEmail(email);
      } else {
        throw e;
      }
    }

    const uid = userRecord.uid;

    await adminDb
      .collection("users")
      .doc(uid)
      .set(
        {
          email,
          name: name || email,
          activeCompanyId: companyId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    await adminDb
      .collection("memberships")
      .doc(`${uid}_${companyId}`)
      .set(
        {
          uid,
          companyId,
          role: role || "viewer",
          email,
          name: name || email,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return NextResponse.json({ success: true, uid });
  } catch (error: any) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: error.message || "Error al invitar" },
      { status: 500 },
    );
  }
}
