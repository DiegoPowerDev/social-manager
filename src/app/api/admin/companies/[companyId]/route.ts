import { NextRequest, NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase-admin";

async function assertSuperAdmin(uid: string) {
  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists || snap.data()?.isSuperAdmin !== true) {
    throw new Error("FORBIDDEN");
  }
}

type Ctx = { params: Promise<{ companyId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const uid = req.headers.get("x-user-uid");
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertSuperAdmin(uid);

    const { companyId } = await ctx.params;
    const companySnap = await adminDb
      .collection("companies")
      .doc(companyId)
      .get();
    if (!companySnap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const membersSnap = await adminDb
      .collection("memberships")
      .where("companyId", "==", companyId)
      .get();

    const members = await Promise.all(
      membersSnap.docs.map(async (m) => {
        const data = m.data();
        const userSnap = await adminDb.collection("users").doc(data.uid).get();
        return {
          id: m.id,
          uid: data.uid,
          role: data.role,
          email: userSnap.data()?.email ?? data.email ?? null,
          name: userSnap.data()?.name ?? null,
        };
      }),
    );

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const usageSnap = await adminDb
      .collection("companies")
      .doc(companyId)
      .collection("usage")
      .doc(period)
      .get();

    return NextResponse.json({
      company: { id: companySnap.id, ...companySnap.data() },
      members,
      usage: usageSnap.exists
        ? usageSnap.data()
        : { aiCaptions: 0, aiImages: 0, period },
      period,
    });
  } catch (e: any) {
    if (e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const uid = req.headers.get("x-user-uid");
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertSuperAdmin(uid);

    const { companyId } = await ctx.params;
    const body = await req.json();

    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.plan !== undefined) update.plan = body.plan;
    if (body.planStatus !== undefined) update.planStatus = body.planStatus;
    if (body.planSource !== undefined) update.planSource = body.planSource;
    if (body.name !== undefined) update.name = body.name;
    if (body.paypalSubscriptionId !== undefined) {
      update.paypalSubscriptionId = body.paypalSubscriptionId || null;
    }
    if (body.nextBillingTime !== undefined) {
      update.nextBillingTime = body.nextBillingTime || null;
    }
    if (body.features?.aiEnabled !== undefined) {
      update.features = { aiEnabled: !!body.features.aiEnabled };
    }
    if (body.limits) {
      update.limits = {
        aiCaptionsPerMonth: Number(body.limits.aiCaptionsPerMonth ?? 0),
        aiImagesPerMonth: Number(body.limits.aiImagesPerMonth ?? 0),
      };
    }

    if (body.partner !== undefined) {
      if (body.partner === null || body.partner.active === false) {
        update.partner = {
          active: false,
          tier: null,
          reason: null,
          until: null,
          limits: null,
          grantedBy: null,
          grantedAt: null,
        };
      } else {
        update.partner = {
          active: true,
          tier: body.partner.tier || "premium",
          reason: (body.partner.reason || "").trim() || "Socio / acceso manual",
          until: body.partner.until || null,
          limits: body.partner.limits || {
            aiCaptionsPerMonth: body.partner.tier === "basic" ? 100 : 150,
            aiImagesPerMonth: body.partner.tier === "basic" ? 30 : 50,
          },
          grantedBy: uid,
          grantedAt: new Date().toISOString(),
        };
      }
    }

    if (body.courtesy !== undefined) {
      if (body.courtesy === null || body.courtesy.active === false) {
        update.courtesy = {
          active: false,
          plan: null,
          until: null,
          reason: null,
          limits: null,
          grantedBy: null,
          grantedAt: null,
        };
      } else {
        update.courtesy = {
          active: true,
          plan: body.courtesy.plan || "premium",
          until: body.courtesy.until || null,
          reason: body.courtesy.reason || "",
          limits: body.courtesy.limits || {
            aiCaptionsPerMonth: 150,
            aiImagesPerMonth: 50,
          },
          grantedBy: uid,
          grantedAt: new Date().toISOString(),
        };
      }
    }

    await adminDb
      .collection("companies")
      .doc(companyId)
      .set(update, { merge: true });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
