import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireCompanyMember, jsonError } from "@/lib/ai-route-helpers";

export async function POST(req: NextRequest) {
  try {
    const { companyId, openId } = await req.json();
    if (!companyId) {
      return NextResponse.json({ error: "Falta companyId" }, { status: 400 });
    }

    await requireCompanyMember(req, companyId);

    const snap = await adminDb
      .collection("socialAccounts")
      .where("companyId", "==", companyId)
      .where("platform", "==", "tiktok")
      .limit(5)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { error: "Cuenta TikTok no conectada" },
        { status: 404 },
      );
    }

    let account = snap.docs[0].data();
    if (openId) {
      const match = snap.docs.find((d) => d.data().openId === openId);
      if (!match) {
        return NextResponse.json(
          { error: "Cuenta no encontrada" },
          { status: 404 },
        );
      }
      account = match.data();
    }

    const token = account.accessToken as string;
    const res = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({}),
      },
    );

    const data = await res.json();
    if (!res.ok || data?.error?.code !== "ok") {
      throw new Error(
        data?.error?.message || "No se pudo obtener info del creator",
      );
    }

    return NextResponse.json({
      creator: data.data,
      // fallback display
      accountName:
        account.name || account.username || data.data?.creator_nickname,
    });
  } catch (e: any) {
    const { status, body } = jsonError(e);
    return NextResponse.json(body, { status });
  }
}
