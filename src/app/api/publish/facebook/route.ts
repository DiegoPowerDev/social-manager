import { NextRequest, NextResponse } from "next/server";
import { publishTextPost } from "@/adapters/facebook";

export async function POST(req: NextRequest) {
  try {
    const { pageId, accessToken, message, link } = await req.json();

    if (!pageId || !accessToken || !message) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios" },
        { status: 400 },
      );
    }

    const result = await publishTextPost(pageId, accessToken, message, link);

    return NextResponse.json({ success: true, postId: result.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
