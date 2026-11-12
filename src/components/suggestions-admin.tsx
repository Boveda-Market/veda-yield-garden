import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_PAYOUT_WALLET } from "@/lib/affiliate";
import { CATEGORY_LABEL, type Suggestion } from "@/lib/suggestions";
import { listSuggestions, setSuggestionStatus } from "@/lib/affiliate.functions";

/** Operator-only: community suggestions. Server re-verifies the treasury owner on every call. */
export function SuggestionsAdmin() {
  const t = useT();
  const session = useBovedaSession();
  const list = useServerFn(listSuggestions);
  const mark = useServerFn(setSuggestionStatus);
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (session.walletAddress !== AFFILIATE_PAYOUT_WALLET) return null;
  async function token() { const v = await session.getAccessToken?.(); if (!v) throw new Error(); return v; }
  async function load() {
    setBusy(true); setMsg("");
    try { const r = await list({ data: { token: await token() } }); if (r.success) setItems(r.items); else setMsg(t(r.error)); }
    catch { setMsg(t("No se pudieron cargar las sugerencias.")); } finally { setBusy(false); }
  }
  async function toggle(s: Suggestion) {
    const status = s.status === "unread" ? "reviewed" : "unread";
    try { const r = await mark({ data: { token: await token(), id: s.id, status } }); if (r.success) setItems((xs) => xs?.map((x) => x.id === s.id ? { ...x, status } : x) ?? null); }
    catch { setMsg(t("No se pudo actualizar.")); }
  }
  const unread = items?.filter((s) => s.status === "unread").length ?? 0;
  return <section className="mt-6 rounded-2xl border border-border bg-card p-5" aria-labelledby="suggestions-title">
    <div className="flex items-center justify-between gap-3">
      <h2 id="suggestions-title" className="flex items-center gap-2 font-display text-lg font-semibold"><Lightbulb size={18} className="text-primary" />{t("Sugerencias de la comunidad")}{items && unread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{unread} {t("nuevas")}</span>}</h2>
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>{busy ? t("Cargando…") : items ? t("Actualizar") : t("Ver sugerencias")}</Button>
    </div>
    {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
    {items && (items.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t("Aún no hay sugerencias.")}</p> :
      <ul className="mt-4 space-y-2">{items.map((s) => <li key={s.id} className={`rounded-xl border p-3 ${s.status === "unread" ? "border-primary/40 bg-primary/5" : "border-border"}`}>
        <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString()} · {t(CATEGORY_LABEL[s.category])} · {s.wallet ? `${s.wallet.slice(0, 4)}…${s.wallet.slice(-4)}` : "—"}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{s.message}</p>
        <Button size="sm" variant="ghost" className="mt-1 px-2" onClick={() => void toggle(s)}>{s.status === "unread" ? t("Marcar como leída") : t("Marcar como nueva")}</Button>
      </li>)}</ul>)}
  </section>;
}
