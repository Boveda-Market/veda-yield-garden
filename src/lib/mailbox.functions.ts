import { createServerFn } from "@tanstack/react-start";
import { mailboxListRequest, mailboxReadRequest, mailboxSendRequest, rawEmail, decodePart, type MailRow } from "./mailbox";

// Only show mail sent to or from the app domain.
const DOMAIN_Q = "{to:bovedamarket.app from:bovedamarket.app cc:bovedamarket.app deliveredto:bovedamarket.app}";
type Fail = { success: false; error: string };
const GW = "https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me";

async function gmail(path: string, init?: RequestInit) {
  const lk = process.env["LOVABLE_API_KEY"], gk = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lk || !gk) throw new Error("Gmail no está conectado.");
  const r = await fetch(`${GW}${path}`, { ...init, headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk, "Content-Type": "application/json" } });
  if (!r.ok) { console.error(`Gmail [${r.status}]: ${await r.text()}`); throw new Error(`Gmail respondió ${r.status}.`); }
  return r.json();
}
async function guard(token: string) { const { payoutAdmin } = await import("./affiliate.functions"); await payoutAdmin(token); }
const err = (e: unknown): Fail => ({ success: false, error: e instanceof Error && e.message !== "forbidden" ? e.message : "No autorizado." });
const h = (m: any, n: string) => (m.payload?.headers ?? []).find((x: any) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";

export const listMailbox = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => mailboxListRequest.parse(i))
  .handler(async ({ data }): Promise<{ success: true; items: MailRow[]; next: string | null; aliases: string[] } | Fail> => {
    try {
      await guard(data.token);
      const qs = new URLSearchParams({ maxResults: "20", q: `${data.q || "in:inbox"} ${DOMAIN_Q}` });
      if (data.pageToken) qs.set("pageToken", data.pageToken);
      const [list, sendAs] = await Promise.all([gmail(`/messages?${qs}`), gmail("/settings/sendAs").catch(() => ({ sendAs: [] }))]);
      const ids: string[] = (list.messages ?? []).map((m: any) => m.id);
      const meta = "format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date";
      const msgs = await Promise.all(ids.map((id) => gmail(`/messages/${id}?${meta}`).catch(() => null)));
      const items = msgs.filter(Boolean).map((m: any) => ({ id: m.id, threadId: m.threadId, from: h(m, "From"), to: h(m, "To"), subject: h(m, "Subject"), date: h(m, "Date"), snippet: m.snippet ?? "", unread: (m.labelIds ?? []).includes("UNREAD") }));
      return { success: true, items, next: list.nextPageToken ?? null, aliases: (sendAs.sendAs ?? []).map((s: any) => s.sendAsEmail as string) };
    } catch (e) { return err(e); }
  });

function bodyOf(p: any): { text: string; html: string } {
  let text = "", html = "";
  const walk = (x: any) => { if (!x) return; if (x.body?.data) { if (x.mimeType === "text/plain" && !text) text = decodePart(x.body.data); if (x.mimeType === "text/html" && !html) html = decodePart(x.body.data); } (x.parts ?? []).forEach(walk); };
  walk(p);
  return { text, html };
}

export const readMail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => mailboxReadRequest.parse(i))
  .handler(async ({ data }): Promise<{ success: true; text: string; messageId: string } | Fail> => {
    try {
      await guard(data.token);
      const m = await gmail(`/messages/${data.id}?format=full`);
      if ((m.labelIds ?? []).includes("UNREAD")) await gmail(`/messages/${data.id}/modify`, { method: "POST", body: JSON.stringify({ removeLabelIds: ["UNREAD"] }) }).catch(() => null);
      const b = bodyOf(m.payload);
      const text = b.text || b.html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s{3,}/g, "\n\n").trim();
      return { success: true, text: text.slice(0, 50000), messageId: h(m, "Message-ID") };
    } catch (e) { return err(e); }
  });

export const trashMail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => mailboxReadRequest.parse(i))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try { await guard(data.token); await gmail(`/messages/${data.id}/trash`, { method: "POST" }); return { success: true }; } catch (e) { return err(e); }
  });

export const sendMail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => mailboxSendRequest.parse(i))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try {
      await guard(data.token);
      const { sendAs } = await gmail("/settings/sendAs");
      if (!(sendAs ?? []).some((s: any) => s.sendAsEmail.toLowerCase() === data.from.toLowerCase())) return { success: false, error: "Ese remitente no está configurado en Gmail." };
      await gmail("/messages/send", { method: "POST", body: JSON.stringify({ raw: rawEmail(data), ...(data.threadId ? { threadId: data.threadId } : {}) }) });
      return { success: true };
    } catch (e) { return err(e); }
  });
