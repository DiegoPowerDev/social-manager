// import { NextRequest, NextResponse } from "next/server";
// import { stripe } from "@/lib/stripe";
// import { adminDb } from "@/lib/firebase-admin";

// export async function POST(req: NextRequest) {
//   const { companyId, uid } = await req.json();

//   const membership = await adminDb
//     .collection("memberships")
//     .doc(`${uid}_${companyId}`)
//     .get();
//   if (!membership.exists || membership.data()?.role !== "admin") {
//     return NextResponse.json({ error: "No autorizado" }, { status: 403 });
//   }

//   const company = await adminDb.collection("companies").doc(companyId).get();
//   const customerId = company.data()?.stripeCustomerId;
//   if (!customerId) {
//     return NextResponse.json({ error: "Sin cliente Stripe" }, { status: 400 });
//   }

//   const session = await stripe.billingPortal.sessions.create({
//     customer: customerId,
//     return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
//   });

//   return NextResponse.json({ url: session.url });
// }
