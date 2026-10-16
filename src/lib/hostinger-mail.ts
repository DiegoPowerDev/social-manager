const API = "https://developers.hostinger.com";

export async function sendHostingerEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const token = process.env.HOSTINGER_MAIL_TOKEN;
  const mailboxId = process.env.HOSTINGER_MAILBOX_ID;
  const fromName = process.env.HOSTINGER_MAIL_FROM_NAME || "TrendlyStudio";

  if (!token || !mailboxId) {
    throw new Error("Faltan HOSTINGER_MAIL_TOKEN o HOSTINGER_MAILBOX_ID");
  }

  // Endpoint de envío desde mailbox (API Hostinger)
  const res = await fetch(`${API}/api/email/v1/mailboxes/${mailboxId}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from: {
        name: fromName,
      },
      to: [{ address: opts.to }],
      subject: opts.subject,
      html: opts.html,
      text: opts.text || opts.html.replace(/<[^>]+>/g, " "),
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("Hostinger mail error:", res.status, data);
    throw new Error(
      data.message || data.error || `Hostinger mail ${res.status}`,
    );
  }

  return data;
}
