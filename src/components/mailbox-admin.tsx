import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_PAYOUT_WALLET } from "@/lib/affiliate";
import type { MailRow } from "@/lib/mailbox";
import { listMailbox, readMail, sendMail, trashMail } from "@/lib/mailbox.functions";

const FOLDERS = [["in:inbox", "Recibidos"], ["is:unread in:inbox", "Sin leer"], ["in:sent", "Enviados"]] as const;
const addr = (v: string) => (v.match(/<([^>]+)>/)?.[1] ?? v).trim();

/** Operator-only Gmail inbox. Server re-verifies the treasury owner on every call. */
export function MailboxAdmin() {
  const t = useT();
  const session = useBovedaSession();
  const list = useServerFn(listMailbox), read = useServerFn(readMail), send = useServerFn(sendMail), trash = useServerFn(trashMail);
  const [q, setQ] = useState<string>("in:inbox");
  const [items, setItems] = useState<MailRow[] | null>(null);
  const [aliases, setAliases] = useState<string[]>([]);
  const [open, setOpen] = useState<{ row: MailRow; text: string; messageId: string } | null>(null);
  const [draft, setDraft] = useState<{ from: string; to: string; subject: string; body: string; threadId?: string | undefined; inReplyTo?: string | undefined } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (session.walletAddress !== AFFILIATE_PAYOUT_WALLET) return null;
  async function token() { const v = await session.getAccessToken?.(); if (!v) throw new Error(); return v; }
  async function load(query = q) {
    setBusy(true); setMsg(""); setQ(query); setOpen(null);
    try { const r = await list({ data: { token: await token(), q: query } }); if (r.success) { setItems(r.items); setAliases(r.aliases); } else setMsg(t(r.error)); }
    catch { setMsg(t("No se pudo cargar el correo.")); } finally { setBusy(false); }
  }
  async function view(row: MailRow) {
    setBusy(true);
    try { const r = await read({ data: { token: await token(), id: row.id } }); if (r.success) { setOpen({ row, text: r.text, messageId: r.messageId }); setItems((xs) => xs?.map((x) => x.id === row.id ? { ...x, unread: false } : x) ?? null); } else setMsg(t(r.error)); }
    catch { setMsg(t("No se pudo abrir el mensaje.")); } finally { setBusy(false); }
  }
  async function remove(row: MailRow) {
    try { const r = await trash({ data: { token: await token(), id: row.id } }); if (r.success) { setItems((xs) => xs?.filter((x) => x.id !== row.id) ?? null); setOpen(null); } else setMsg(t(r.error)); } catch { setMsg(t("No se pudo borrar.")); }
  }
  async function submit() {
    if (!draft) return;
    setBusy(true); setMsg("");
    try { const r = await send({ data: { token: await token(), ...draft } }); if (r.success) { setDraft(null); setMsg(t("Correo enviado.")); } else setMsg(t(r.error)); }
    catch { setMsg(t("No se pudo enviar. Revisa los datos.")); } finally { setBusy(false); }
  }
  const compose = (extra?: Partial<NonNullable<typeof draft>>) => setDraft({ from: aliases.find((a) => a.endsWith("@bovedamarket.app")) ?? aliases[0] ?? "", to: "", subject: "", body: "", ...extra });
  const field = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
  return <section className="mt-6 rounded-2xl border border-border bg-card p-5" aria-labelledby="mailbox-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="mailbox-title" className="flex items-center gap-2 font-display text-lg font-semibold"><Inbox size={18} className="text-primary" />{t("Correo de Bóveda Market")}</h2>
      <div className="flex gap-2">{items && <Button size="sm" onClick={() => compose()}><Send size={14} />{t("Redactar")}</Button>}<Button size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>{busy ? t("Cargando…") : items ? t("Actualizar") : t("Abrir correo")}</Button></div>
    </div>
    <p className="mt-1 text-xs text-muted-foreground">{t("Los correos a admin@, dev@ y demás llegan a tu Gmail y los lees aquí.")}</p>
    {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
    {items && <div className="mt-3 flex flex-wrap gap-2">{FOLDERS.map(([v, l]) => <Button key={v} size="sm" variant={q === v ? "default" : "outline"} onClick={() => void load(v)}>{t(l)}</Button>)}</div>}
    {draft && <div className="mt-4 space-y-2 rounded-xl border border-primary/40 p-3">
      <div className="flex items-center justify-between"><p className="text-sm font-semibold">{t("Nuevo correo")}</p><Button size="sm" variant="ghost" aria-label={t("Cerrar")} onClick={() => setDraft(null)}><X size={14} /></Button></div>
      <label className="block text-xs text-muted-foreground">{t("Desde")}<select className={field} value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })}>{aliases.map((a) => <option key={a}>{a}</option>)}</select></label>
      <input className={field} type="email" placeholder={t("Para")} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
      <input className={field} placeholder={t("Asunto")} maxLength={200} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
      <textarea className={`${field} min-h-32`} placeholder={t("Mensaje")} maxLength={20000} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
      <Button size="sm" disabled={busy || !draft.from || !draft.to || !draft.subject || !draft.body} onClick={() => void submit()}><Send size={14} />{t("Enviar")}</Button>
    </div>}
    {open && <article className="mt-4 rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-words font-semibold">{open.row.subject || t("(Sin asunto)")}</p><p className="break-all text-xs text-muted-foreground">{open.row.from} · {open.row.date}</p></div><Button size="sm" variant="ghost" aria-label={t("Cerrar")} onClick={() => setOpen(null)}><X size={14} /></Button></div>
      <p className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm">{open.text || open.row.snippet}</p>
      <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => compose({ to: addr(open.row.from), subject: open.row.subject.startsWith("Re:") ? open.row.subject : `Re: ${open.row.subject}`, threadId: open.row.threadId, inReplyTo: open.messageId || undefined, from: aliases.find((a) => open.row.to.toLowerCase().includes(a.toLowerCase())) ?? aliases[0] ?? "" })}>{t("Responder")}</Button><Button size="sm" variant="outline" onClick={() => void remove(open.row)}><Trash2 size={14} />{t("Borrar")}</Button></div>
    </article>}
    {items && !open && (items.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t("No hay mensajes.")}</p> :
      <ul className="mt-3 divide-y divide-border">{items.map((m) => <li key={m.id}><button type="button" className="w-full py-2 text-left" onClick={() => void view(m)}>
        <p className={`truncate text-sm ${m.unread ? "font-semibold" : ""}`}>{m.unread && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />}{q === "in:sent" ? m.to : m.from}</p>
        <p className="truncate text-sm">{m.subject || t("(Sin asunto)")}</p>
        <p className="truncate text-xs text-muted-foreground">{m.snippet}</p>
      </button></li>)}</ul>)}
  </section>;
}
