export async function sendHostingerEmail(options: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  displayName?: string;
}) {
  const token = process.env.HOSTINGER_MAIL_TOKEN;
  const mailboxId = process.env.HOSTINGER_MAILBOX_ID;
  const fromName =
    options.displayName ||
    process.env.HOSTINGER_MAIL_FROM_NAME ||
    "TrendlyStudio";

  if (!token || !mailboxId) {
    throw new Error("Faltan HOSTINGER_MAIL_TOKEN o HOSTINGER_MAILBOX_ID");
  }

  const to = Array.isArray(options.to) ? options.to : [options.to];

  const res = await fetch(
    `https://api.mail.hostinger.com/api/v1/mailboxes/${mailboxId}/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        display_name: fromName,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    },
  );

  // Hostinger suele responder 204 No Content si salió bien
  if (!res.ok && res.status !== 204) {
    const errText = await res.text().catch(() => "");
    console.error("Hostinger mail error:", res.status, errText);
    throw new Error(errText || `Error enviando email (HTTP ${res.status})`);
  }

  return { ok: true };
}
