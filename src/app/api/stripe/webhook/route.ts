// import { NextRequest, NextResponse } from "next/server";
// import { stripe } from "@/lib/stripe";
// import { adminDb } from "@/lib/firebase-admin";
// import { PLAN_LIMITS } from "@/lib/tenant";
// import type Stripe from "stripe";

// export const runtime = "nodejs";

// async function applyPlan(
//   companyId: string,
//   plan: "free" | "monthly" | "yearly",
// ) {
//   const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
//   await adminDb
//     .collection("companies")
//     .doc(companyId)
//     .set(
//       {
//         plan,
//         planStatus: plan === "free" ? "active" : "active",
//         features: { aiEnabled: limits.aiEnabled },
//         limits: {
//           aiCaptionsPerMonth: limits.aiCaptionsPerMonth,
//           aiImagesPerMonth: limits.aiImagesPerMonth,
//         },
//         updatedAt: new Date(),
//       },
//       { merge: true },
//     );
// }

// export async function POST(req: NextRequest) {
//   const body = await req.text();
//   const sig = req.headers.get("stripe-signature");

//   if (!sig) {
//     return NextResponse.json({ error: "No signature" }, { status: 400 });
//   }

//   let event: Stripe.Event;
//   try {
//     event = stripe.webhooks.constructEvent(
//       body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET!,
//     );
//   } catch (err: any) {
//     console.error("Webhook signature error:", err.message);
//     return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
//   }

//   try {
//     switch (event.type) {
//       case "checkout.session.completed": {
//         const session = event.data.object as Stripe.Checkout.Session;
//         const companyId = session.metadata?.companyId;
//         const plan = (session.metadata?.plan || "monthly") as
//           | "monthly"
//           | "yearly";
//         if (companyId) {
//           await adminDb
//             .collection("companies")
//             .doc(companyId)
//             .set(
//               {
//                 stripeCustomerId: session.customer as string,
//                 stripeSubscriptionId: session.subscription as string,
//               },
//               { merge: true },
//             );
//           await applyPlan(companyId, plan);
//         }
//         break;
//       }

//       case "customer.subscription.updated": {
//         const sub = event.data.object as Stripe.Subscription;
//         const companyId = sub.metadata?.companyId;
//         if (!companyId) break;

//         if (sub.status === "active" || sub.status === "trialing") {
//           const plan = (sub.metadata?.plan || "monthly") as
//             | "monthly"
//             | "yearly";
//           await applyPlan(companyId, plan);
//           await adminDb.collection("companies").doc(companyId).set(
//             {
//               planStatus: sub.status,
//               stripeSubscriptionId: sub.id,
//             },
//             { merge: true },
//           );
//         }
//         if (sub.status === "canceled" || sub.status === "unpaid") {
//           await applyPlan(companyId, "free");
//           await adminDb
//             .collection("companies")
//             .doc(companyId)
//             .set({ planStatus: sub.status }, { merge: true });
//         }
//         break;
//       }

//       case "customer.subscription.deleted": {
//         const sub = event.data.object as Stripe.Subscription;
//         const companyId = sub.metadata?.companyId;
//         if (companyId) {
//           await applyPlan(companyId, "free");
//           await adminDb.collection("companies").doc(companyId).set(
//             {
//               planStatus: "canceled",
//               stripeSubscriptionId: null,
//             },
//             { merge: true },
//           );
//         }
//         break;
//       }
//     }
//   } catch (e) {
//     console.error("Webhook handler error:", e);
//     return NextResponse.json({ error: "Handler failed" }, { status: 500 });
//   }

//   return NextResponse.json({ received: true });
// }
