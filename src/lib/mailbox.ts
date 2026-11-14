import { z } from "zod";

const token = z.string().min(20).max(4000);
export const mailboxListRequest = z.object({ token, q: z.string().max(200).default(""), pageToken: z.string().max(200).optional() }).strict();
export const mailboxReadRequest = z.object({ token, id: z.string().regex(/^[A-Za-z0-9]+$/).max(64) }).strict();
export const mailboxSendRequest = z.object({
  token,
  from: z.string().email().max(254),
  to: z.string().email().max(254),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
  threadId: z.string().regex(/^[A-Za-z0-9]+$/).max(64).optional(),
  inReplyTo: z.string().max(500).optional(),
}).strict();

export type MailRow = { id: string; threadId: string; from: string; to: string; subject: string; date: string; snippet: string; unread: boolean };

const b64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);
const clean = (v: string) => v.replace(/[\r\n]+/g, " ");

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const LOGO = "https://bovedamarket.app/icon-512.png";

/** Branded HTML version of a plain-text body; all user text is escaped. */
export function htmlEmail(body: string) {
  const text = esc(body).replace(/\r?\n/g, "<br>");
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f6f3;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0f1a14">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f3;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e3e8e1">
<tr><td style="background:#0c140f;padding:20px 24px"><img src="${LOGO}" width="40" height="40" alt="BÓVEDA" style="vertical-align:middle;border-radius:10px"><span style="vertical-align:middle;margin-left:12px;color:#c6f24a;font-size:20px;font-weight:700;letter-spacing:1px">BÓVEDA</span></td></tr>
<tr><td style="padding:28px 24px;font-size:15px;line-height:1.6">${text}</td></tr>
<tr><td style="padding:20px 24px;border-top:1px solid #e3e8e1;font-size:12px;line-height:1.5;color:#5b6b60">
<img src="${LOGO}" width="24" height="24" alt="" style="vertical-align:middle;border-radius:6px"> <a href="https://bovedamarket.app" style="color:#0f1a14;font-weight:600;text-decoration:none;vertical-align:middle">bovedamarket.app</a> · <a href="https://t.me/bovedamarket" style="color:#0f1a14;text-decoration:none;vertical-align:middle">Telegram</a><br><br>
BÓVEDA jamás te pedirá claves privadas, frases de recuperación ni transferencias por correo.</td></tr>
</table></td></tr></table></body></html>`;
}

/** RFC 2822 multipart/alternative message (plain + branded HTML), base64url. Header values are stripped of line breaks so no header can be injected. */
export function rawEmail(m: { from: string; to: string; subject: string; body: string; inReplyTo?: string | undefined }) {
  const boundary = `boveda_${Math.random().toString(36).slice(2)}`;
  const lines = [`From: ${header("BÓVEDA")} <${clean(m.from)}>`, `To: ${clean(m.to)}`, `Subject: ${header(clean(m.subject))}`];
  if (m.inReplyTo) lines.push(`In-Reply-To: ${clean(m.inReplyTo)}`, `References: ${clean(m.inReplyTo)}`);
  lines.push("MIME-Version: 1.0", `Content-Type: multipart/alternative; boundary="${boundary}"`, "",
    `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", b64(m.body),
    `--${boundary}`, 'Content-Type: text/html; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", b64(htmlEmail(m.body)),
    `--${boundary}--`, "");
  return b64(lines.join("\r\n")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decodes Gmail base64url UTF-8 body parts. */
export function decodePart(data: string) {
  const bin = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
