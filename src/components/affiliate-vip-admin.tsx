import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_SHARE_BPS, AFFILIATE_PAYOUT_WALLET, VIP_MAX_BPS, VIP_MIN_BPS, type AffiliateRow, type VipCode } from "@/lib/affiliate";
import { createVipCode, listAffiliateDirectory, listVipCodes, toggleVipCode, updateVipCode, deleteVipCode, setAffiliateShare } from "@/lib/affiliate.functions";

const usdc = (raw: string) => (Number(raw) / 1e6).toFixed(2);
const AFF_RATES = Array.from({ length: (VIP_MAX_BPS - AFFILIATE_SHARE_BPS) / 1000 + 1 }, (_, i) => AFFILIATE_SHARE_BPS + i * 1000);
const RATES = Array.from({ length: (VIP_MAX_BPS - VIP_MIN_BPS) / 1000 + 1 }, (_, i) => VIP_MIN_BPS + i * 1000);

/** Operator-only VIP code manager and affiliate directory; server re-verifies the treasury wallet owner on every call. */
export function AffiliateVipAdmin() {
  const t = useT();
  const session = useBovedaSession();
  const list = useServerFn(listVipCodes);
  const create = useServerFn(createVipCode);
  const toggle = useServerFn(toggleVipCode);
  const dir = useServerFn(listAffiliateDirectory);
  const update = useServerFn(updateVipCode);
  const remove = useServerFn(deleteVipCode);
  const setShare = useServerFn(setAffiliateShare);
  const [edit, setEdit] = useState<{ code: string; newCode: string; bps: number } | null>(null);
  const [affEdit, setAffEdit] = useState<{ code: string; bps: number } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<"codes" | "dir">("codes");
  const [codes, setCodes] = useState<VipCode[] | null>(null);
  const [affs, setAffs] = useState<AffiliateRow[] | null>(null);
  const [code, setCode] = useState("");
  const [bps, setBps] = useState(8000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (session.walletAddress !== AFFILIATE_PAYOUT_WALLET) return null;

  async function token() { const v = await session.getAccessToken?.(); if (!v) throw new Error(); return v; }
  async function load() {
    setBusy(true); setMsg(null);
    try {
      const tk = await token();
      const [c, d] = await Promise.all([list({ data: { token: tk } }), dir({ data: { token: tk } })]);
      if (c.success) setCodes(c.codes); else setMsg(t(c.error));
      if (d.success) setAffs(d.affiliates); else setMsg(t(d.error));
    } catch { setMsg(t("Abre primero el panel de tesorería para verificar tu wallet.")); } finally { setBusy(false); }
  }
  async function run(fn: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    setBusy(true); setMsg(null);
    try { const r = await fn(); setMsg(r.success ? t(ok) : t(r.error ?? "No se pudo completar.")); if (r.success) { setBusy(false); await load(); } } catch { setMsg(t("No se pudo completar.")); } finally { setBusy(false); }
  }
  const tabCls = (on: boolean) => `rounded-full px-3 py-1 text-sm ${on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`;

  return <section className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-5" aria-labelledby="vip-title">
    <h2 id="vip-title" className="font-display text-xl font-semibold">{t("Afiliados y códigos VIP (operador)")}</h2>
    {!codes ? <Button className="mt-4" onClick={() => void load()} disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />}{t("Abrir gestor de afiliados")}</Button> : <>
      <div className="mt-4 flex gap-2" role="tablist">
        <button role="tab" aria-selected={tab === "codes"} className={tabCls(tab === "codes")} onClick={() => setTab("codes")}>{t("Códigos VIP")}</button>
        <button role="tab" aria-selected={tab === "dir"} className={tabCls(tab === "dir")} onClick={() => setTab("dir")}>{t("Directorio de afiliados")}</button>
      </div>
      {tab === "codes" ? <>
        <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); const c = code.trim().toUpperCase(); if (!/^[A-Z0-9]{4,16}$/.test(c)) { setMsg(t("Usa de 4 a 16 letras o números, sin espacios.")); return; } void run(async () => create({ data: { token: await token(), code: c, shareBps: bps } }), "Código VIP creado.").then(() => setCode("")); }}>
          <input aria-label={t("Nuevo código")} placeholder="PARTNER80" value={code} maxLength={16} onChange={(e) => setCode(e.target.value.toUpperCase())} className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm" />
          <select aria-label={t("Comisión")} value={bps} onChange={(e) => setBps(Number(e.target.value))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">{RATES.map((r) => <option key={r} value={r}>{r / 100}%</option>)}</select>
          <Button type="submit" disabled={busy}><Plus size={14} />{t("Crear código")}</Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">{t("Cada código sirve una sola vez, para una sola cuenta.")}</p>
        {codes.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{t("Aún no hay códigos.")}</p> :
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card text-sm">{codes.map((c) => <li key={c.code} className="flex flex-wrap items-center gap-2 px-3 py-2">
            {edit?.code === c.code ? <>
              <input aria-label={t("Código")} value={edit.newCode} maxLength={16} onChange={(e) => setEdit({ ...edit, newCode: e.target.value.toUpperCase() })} className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1 font-mono text-sm" />
              <select aria-label={t("Comisión")} value={edit.bps} onChange={(e) => setEdit({ ...edit, bps: Number(e.target.value) })} className="rounded-lg border border-input bg-background px-2 py-1 text-sm">{RATES.map((r) => <option key={r} value={r}>{r / 100}%</option>)}</select>
              <Button size="sm" disabled={busy} aria-label={t("Guardar")} onClick={() => { const n = edit.newCode.trim(); if (!/^[A-Z0-9]{4,16}$/.test(n)) { setMsg(t("Usa de 4 a 16 letras o números, sin espacios.")); return; } void run(async () => update({ data: { token: await token(), code: c.code, newCode: n, shareBps: edit.bps } }), "Código actualizado.").then(() => setEdit(null)); }}><Check size={14} /></Button>
              <Button size="sm" variant="ghost" aria-label={t("Cancelar")} onClick={() => setEdit(null)}><X size={14} /></Button>
            </> : <>
            <div className="min-w-0 flex-1"><p className="font-mono font-semibold">{c.code} · {c.shareBps / 100}%</p>
              <p className="text-xs text-muted-foreground">{c.used ? `${t("Canjeado")} ${c.redeemedAt ? new Date(c.redeemedAt).toLocaleDateString() : ""}${c.redeemedBy ? ` · ${c.redeemedBy}` : ""}` : c.active ? t("Disponible") : t("Desactivado")}</p></div>
            <Button size="sm" variant="ghost" aria-label={t("Copiar")} onClick={() => { void navigator.clipboard?.writeText(c.code); setCopied(c.code); setTimeout(() => setCopied(null), 1500); }}>{copied === c.code ? <Check size={14} /> : <Copy size={14} />}</Button>
            {!c.used && <>
              <Button size="sm" variant="ghost" aria-label={t("Editar")} disabled={busy} onClick={() => setEdit({ code: c.code, newCode: c.code, bps: c.shareBps })}><Pencil size={14} /></Button>
              <Button size="sm" variant="ghost" aria-label={t("Eliminar")} disabled={busy} onClick={() => { if (window.confirm(t("¿Eliminar este código? No se puede deshacer."))) void run(async () => remove({ data: { token: await token(), code: c.code } }), "Código eliminado."); }}><Trash2 size={14} /></Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => toggle({ data: { token: await token(), code: c.code, active: !c.active } }), c.active ? "Código desactivado." : "Código activado.")}>{c.active ? t("Desactivar") : t("Activar")}</Button>
            </>}
            </>}
          </li>)}</ul>}
      </> : (affs ?? []).length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{t("Aún no hay afiliados.")}</p> :
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">{t("Código")}</th><th className="px-3 py-2">{t("Comisión")}</th><th className="px-3 py-2">{t("Invitados")}</th><th className="px-3 py-2">{t("Por cobrar")}</th><th className="px-3 py-2">{t("Pagado")}</th><th className="px-3 py-2" /></tr></thead>
          <tbody className="divide-y divide-border">{(affs ?? []).map((a) => <tr key={a.code}><td className="px-3 py-2 font-mono">{a.code}</td><td className="px-3 py-2">{affEdit?.code === a.code ? <select aria-label={t("Comisión")} value={affEdit.bps} onChange={(e) => setAffEdit({ ...affEdit, bps: Number(e.target.value) })} className="rounded border border-input bg-background px-1 py-0.5 text-sm">{AFF_RATES.map((r) => <option key={r} value={r}>{r / 100}%</option>)}</select> : <>{a.shareBps / 100}%{a.shareBps > 5000 && <span className="ml-1 rounded bg-primary/15 px-1 text-xs text-primary">VIP</span>}</>}</td><td className="px-3 py-2">{a.referred}</td><td className="px-3 py-2">{usdc(a.pendingRaw)}</td><td className="px-3 py-2">{usdc(a.paidRaw)}</td><td className="whitespace-nowrap px-3 py-2">{affEdit?.code === a.code ? <><Button size="sm" disabled={busy} aria-label={t("Guardar")} onClick={() => void run(async () => setShare({ data: { token: await token(), code: a.code, shareBps: affEdit.bps } }), "Comisión actualizada.").then(() => setAffEdit(null))}><Check size={14} /></Button><Button size="sm" variant="ghost" aria-label={t("Cancelar")} onClick={() => setAffEdit(null)}><X size={14} /></Button></> : <Button size="sm" variant="outline" disabled={busy} onClick={() => setAffEdit({ code: a.code, bps: Math.max(AFFILIATE_SHARE_BPS, Math.min(VIP_MAX_BPS, Math.round(a.shareBps / 1000) * 1000)) })}>{t("Ajustar %")}</Button>}</td></tr>)}</tbody>
        </table></div>}
    </>}
    {msg && <p role="status" className="mt-3 text-sm">{msg}</p>}
  </section>;
}
