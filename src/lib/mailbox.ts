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

/** RFC 2822 message, base64url. Header values are stripped of line breaks so no header can be injected. */
export function rawEmail(m: { from: string; to: string; subject: string; body: string; inReplyTo?: string | undefined }) {
  const lines = [`From: ${header("BÓVEDA")} <${clean(m.from)}>`, `To: ${clean(m.to)}`, `Subject: ${header(clean(m.subject))}`];
  if (m.inReplyTo) lines.push(`In-Reply-To: ${clean(m.inReplyTo)}`, `References: ${clean(m.inReplyTo)}`);
  lines.push("MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", b64(m.body));
  return b64(lines.join("\r\n")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decodes Gmail base64url UTF-8 body parts. */
export function decodePart(data: string) {
  const bin = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
