import { NextRequest, NextResponse } from "next/server";
import { stripe, PRICE_IDS, type PaidPlan } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { companyId, plan, uid } = await req.json();

    if (!companyId || !uid || !plan) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }
    if (plan !== "monthly" && plan !== "yearly") {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }

    // Solo admin de la empresa
    const membership = await adminDb
      .collection("memberships")
      .doc(`${uid}_${companyId}`)
      .get();
    if (!membership.exists || membership.data()?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const companyRef = adminDb.collection("companies").doc(companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
      return NextResponse.json(
        { error: "Empresa no encontrada" },
        { status: 404 },
      );
    }

    const company = companySnap.data()!;
    let customerId = company.stripeCustomerId as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: membership.data()?.email,
        metadata: { companyId },
      });
      customerId = customer.id;
      await companyRef.set({ stripeCustomerId: customerId }, { merge: true });
    }

    const priceId = PRICE_IDS[plan as PaidPlan];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/settings?billing=success`,
      cancel_url: `${baseUrl}/dashboard/settings?billing=cancel`,
      metadata: { companyId, plan },
      subscription_data: {
        metadata: { companyId, plan },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Error al crear checkout" },
      { status: 500 },
    );
  }
}
