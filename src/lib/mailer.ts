/** Transactional email over plain HTTPS — no SDK. Both providers have a free tier that
 * comfortably covers sign-in codes:
 *   - Brevo:  300 emails/day free. Verify one sender address; no DNS needed to start.
 *   - Resend: 3,000/month (100/day) free. Needs your domain's DNS records verified.
 * With neither key set outside production, the email is printed to the server console. */

const FROM = process.env.EMAIL_FROM ?? "PM Agent <no-reply@example.com>";

function parseFrom(from: string): { name: string; email: string } {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || "PM Agent", email: m[2] } : { name: "PM Agent", email: from.trim() };
}

export async function sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
  let res: Response;
  if (process.env.BREVO_API_KEY) {
    res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sender: parseFrom(FROM), to: [{ email: to }], subject, textContent: text, htmlContent: html }),
    });
  } else if (process.env.RESEND_API_KEY) {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, text, html }),
    });
  } else if (process.env.NODE_ENV !== "production") {
    console.log(`\n[mailer] No BREVO_API_KEY / RESEND_API_KEY set — email not sent.\n  To: ${to}\n  Subject: ${subject}\n  ${text}\n`);
    return;
  } else {
    throw new Error("Email is not configured. Set BREVO_API_KEY or RESEND_API_KEY.");
  }
  if (!res.ok) {
    console.error("[mailer] send failed", res.status, await res.text().catch(() => ""));
    throw new Error("We couldn't send the email. Try again in a minute.");
  }
}

const shell = (body: string) => `<!doctype html><html><body style="margin:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" style="max-width:440px;background:#fff;border:1px solid #e5e7eb;border-radius:12px"><tr><td style="padding:32px">
<div style="font-weight:600;font-size:14px;margin-bottom:24px">PM Agent</div>${body}
</td></tr></table></td></tr></table></body></html>`;

export function codeEmail(code: string, purpose: "signin" | "stepup") {
  const intro = purpose === "signin" ? "Here's your PM Agent sign-in code:" : "Here's your code to unlock Connections:";
  const subject = `${code} is your PM Agent code`;
  const text = `${intro} ${code}\n\nIt expires in 10 minutes. If you didn't request it, you can ignore this email — nobody can sign in without the code.`;
  const html = shell(`<p style="margin:0 0 16px;font-size:15px">${intro}</p>
<div style="font-size:32px;font-weight:700;letter-spacing:8px;font-family:ui-monospace,Menlo,monospace;padding:16px 0">${code}</div>
<p style="margin:16px 0 0;font-size:13px;color:#6b7280">It expires in 10 minutes. If you didn't request it, you can ignore this email — nobody can sign in without the code. PM Agent will never ask you for this code by phone or chat.</p>`);
  return { subject, text, html };
}

export function inviteEmail(invitedBy: string, signInUrl: string) {
  const subject = `${invitedBy} invited you to PM Agent`;
  const text = `${invitedBy} invited you to their PM Agent workspace.\n\nSign in with this email address: ${signInUrl}\nWe'll email you a one-time code — there's no password to set.`;
  const html = shell(`<p style="margin:0 0 16px;font-size:15px"><b>${escapeHtml(invitedBy)}</b> invited you to their PM Agent workspace.</p>
<a href="${signInUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Join the workspace</a>
<p style="margin:20px 0 0;font-size:13px;color:#6b7280">Sign in with this email address. We'll send you a one-time code — there's no password to set.</p>`);
  return { subject, text, html };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
