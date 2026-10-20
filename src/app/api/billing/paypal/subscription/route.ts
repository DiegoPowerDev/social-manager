import { NextRequest, NextResponse } from "next/server";
import { getPayPalAccessToken, paypalBase } from "@/lib/paypal";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const token = await getPayPalAccessToken();
    const res = await fetch(`${paypalBase()}/v1/billing/subscriptions/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || "No se pudo leer la suscripción" },
        { status: res.status },
      );
    }

    // Opcional: enriquecer con doc local
    let planKey: string | null = null;
    try {
      const snap = await adminDb.collection("subscriptions").doc(id).get();
      if (snap.exists) planKey = snap.data()?.planKey ?? null;
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      status: data.status,
      nextBillingTime:
        data.billing_info?.next_billing_time ||
        data.billing_info?.last_payment?.time ||
        null,
      planKey,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Error" }, { status: 500 });
  }
}
