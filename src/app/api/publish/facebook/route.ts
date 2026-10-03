import { NextRequest, NextResponse } from "next/server";
import { publishTextPost } from "@/adapters/facebook";

export async function POST(req: NextRequest) {
  try {
    const { pageId, accessToken, message } = await req.json();

    if (!pageId || !accessToken || !message) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const result = await publishTextPost(pageId, accessToken, message);

    return NextResponse.json({ success: true, postId: result.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
