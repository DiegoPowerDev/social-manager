const API = "https://api.mail.hostinger.com";

export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  const token = process.env.HOSTINGER_MAIL_TOKEN;
  const mailboxId = process.env.HOSTINGER_MAILBOX_ID;

  if (!token || !mailboxId) {
    throw new Error("Faltan HOSTINGER_MAIL_TOKEN o HOSTINGER_MAILBOX_ID");
  }

  const to = Array.isArray(options.to) ? options.to : [options.to];

  const res = await fetch(`${API}/api/v1/mailboxes/${mailboxId}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]+>/g, " "),
      displayName: process.env.HOSTINGER_MAIL_FROM_NAME || "TrendlyStudio",
    }),
  });

  // 204 = OK (sin body)
  if (res.status !== 204 && !res.ok) {
    const err = await res.text();
    console.error("Hostinger mail error:", res.status, err);
    throw new Error(`Error enviando email (${res.status})`);
  }
}

export async function sendWelcomeSetPasswordEmail(
  to: string,
  resetLink: string,
) {
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto;">
      <h1 style="font-size: 20px;">Tu cuenta en TrendlyStudio está lista</h1>
      <p>El pago se confirmó. Crea tu contraseña para entrar al panel:</p>
      <p style="margin: 24px 0;">
        <a href="${resetLink}"
           style="background:#f59e0b;color:#000;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          Definir contraseña
        </a>
      </p>
      <p style="color:#666;font-size:13px;">Si no contrataste nada, ignora este correo.</p>
      <p style="color:#666;font-size:13px;">TrendlyStudio · <a href="https://trendly.studio">trendly.studio</a></p>
    </div>
  `;

  await sendEmail({
    to,
    subject: "Activa tu cuenta TrendlyStudio",
    html,
    text: `Tu cuenta está lista. Define tu contraseña: ${resetLink}`,
  });
}
