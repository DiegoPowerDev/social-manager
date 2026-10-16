import { NextRequest, NextResponse } from "next/server";
import { sendHostingerEmail } from "@/lib/hostinger-mail";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { to, password, isNew, plan, loginUrl } = await req.json();

    if (!to || typeof to !== "string") {
      return NextResponse.json({ error: "Falta to" }, { status: 400 });
    }

    const login =
      loginUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL || "https://www.trendly.studio"}/login`;

    const subject = isNew
      ? "Tu cuenta TrendlyStudio está lista"
      : "Tu plan de TrendlyStudio se actualizó";

    const html = isNew
      ? `
        <p>Hola,</p>
        <p>Tu suscripción <strong>${plan}</strong> está activa.</p>
        <p><strong>Email:</strong> ${to}<br/>
        <strong>Contraseña temporal:</strong> ${password || "(usa la que ya tenías)"}</p>
        <p>Entra aquí: <a href="${login}">${login}</a></p>
        <p>Te recomendamos cambiar la contraseña después del primer acceso.</p>
        <p>— TrendlyStudio</p>
      `
      : `
        <p>Hola,</p>
        <p>Actualizamos tu empresa al plan <strong>${plan}</strong>.</p>
        <p>Panel: <a href="${login}">${login}</a></p>
        <p>— TrendlyStudio</p>
      `;

    await sendHostingerEmail({ to, subject, html });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message || "Error enviando correo" },
      { status: 500 },
    );
  }
}
