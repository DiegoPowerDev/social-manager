import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { platform, appId, appSecret, clientId, clientSecret, companyId } =
      await req.json();

    if (!platform || !companyId) {
      return NextResponse.json(
        { error: "Faltan platform o companyId" },
        { status: 400 },
      );
    }

    const docId = `${companyId}_${platform}`;
    const payload: Record<string, unknown> = {
      companyId,
      platform,
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    if (platform === "linkedin") {
      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { error: "Faltan clientId/clientSecret" },
          { status: 400 },
        );
      }
      payload.clientId = clientId;
      payload.clientSecret = clientSecret;
    } else {
      if (!appId || !appSecret) {
        return NextResponse.json(
          { error: "Faltan appId/appSecret" },
          { status: 400 },
        );
      }
      payload.appId = appId;
      payload.appSecret = appSecret;
    }

    await adminDb.collection("platformCredentials").doc(docId).set(payload, {
      merge: true,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al guardar credenciales" },
      { status: 500 },
    );
  }
}
