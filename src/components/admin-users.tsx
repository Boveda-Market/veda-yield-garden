import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Loader2, RefreshCw, Search, Send, Sparkles, Users, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { useT, useLocale } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { listAdminUsers } from "@/lib/admin-users.functions";
import { getRealWallet } from "@/lib/solana.functions";
import { filterUsers, isOnline, type AdminUser, type Holdings, type UserFilter } from "@/lib/admin-users";

const FILTERS: { key: UserFilter; label: string }[] = [
  { key: "all", label: "Todos" }, { key: "online", label: "Conectados" }, { key: "new", label: "Nuevos (7 días)" }, { key: "vault", label: "Con bóveda" }, { key: "nodeposit", label: "Sin depósito" },
];
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

/** Operator-only Users section: live presence, account list with filters, simple funnel and a detail card. Server re-verifies the treasury owner. */
export function AdminUsers({ visitorsOnline }: { visitorsOnline: number | null }) {
  const t = useT();
  const locale = useLocale();
  const session = useBovedaSession();
  const list = useServerFn(listAdminUsers);
  const readWallet = useServerFn(getRealWallet);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<UserFilter>("all");
  const [q, setQ] = useState("");
  const [holdings, setHoldings] = useState<Record<string, Holdings>>({});
  const [checking, setChecking] = useState<{ done: number; total: number } | null>(null);
  const [open, setOpen] = useState<AdminUser | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  async function load() {
    setBusy(true); setErr("");
    try {
      const token = await session.getAccessToken?.(); if (!token) throw new Error();
      const r = await list({ data: { token } });
      if (r.success) { setUsers(r.users); setTruncated(r.truncated); setNow(Date.now()); } else setErr(t(r.error));
    } catch { setErr(t("No se pudo leer la lista de cuentas. Inténtalo de nuevo.")); } finally { setBusy(false); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); const id = setInterval(() => void load(), 60_000); return () => clearInterval(id); }, []);

  async function checkOne(wallet: string) {
    const r = await readWallet({ data: { wallet } }).catch(() => null);
    if (r?.success) setHoldings((h) => ({ ...h, [wallet]: { usdc: Number(r.data.usdc) || 0, vaults: r.data.positions.length } }));
  }
  async function checkAll() {
    const wallets = [...new Set(filterUsers(users ?? [], filter === "vault" || filter === "nodeposit" ? "all" : filter, q, now).map((u) => u.wallet).filter((w): w is string => !!w && !holdings[w]))].slice(0, 100);
    setChecking({ done: 0, total: wallets.length });
    let i = 0;
    const worker = async () => { while (i < wallets.length) { const w = wallets[i++]!; await checkOne(w); setChecking((c) => c && { ...c, done: c.done + 1 }); } };
    await Promise.all([worker(), worker(), worker()]);
    setChecking(null);
  }

  const shown = useMemo(() => filterUsers(users ?? [], filter, q, now, holdings), [users, filter, q, now, holdings]);
  const all = users ?? [];
  const online = all.filter((u) => isOnline(u.lastSeen, now)).length;
  const recharged = all.filter((u) => u.recharged).length;
  const checked = all.filter((u) => u.wallet && holdings[u.wallet]);
  const withVault = checked.filter((u) => holdings[u.wallet!]!.vaults > 0).length;
  const when = (iso: string | null) => {
    if (!iso) return "—";
    const m = Math.round((now - Date.parse(iso)) / 60_000);
    if (m < 2) return t("Ahora");
    if (m < 60) return t("Hace {n} min", { n: String(m) });
    if (m < 1440) return t("Hace {n} h", { n: String(Math.round(m / 60)) });
    return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
  };
  const stat = (label: string, value: string | number, hint?: string | undefined) => <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>{hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}</div>;

  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stat(t("Conectados ahora"), users ? online : "…", t("con cuenta"))}
      {stat(t("Visitantes ahora"), visitorsOnline ?? "…", t("sin cuenta"))}
      {stat(t("Cuentas"), users ? all.length : "…", truncated ? t("primeras 1,000") : undefined)}
      {stat(t("Nuevas en 7 días"), users ? filterUsers(all, "new", "", now).length : "…")}
    </div>

    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">{t("Embudo")}</p>
      <ol className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[[t("Cuentas creadas"), all.length], [t("Recargaron dólares"), recharged], [t("Con bóveda"), checked.length ? `${withVault}/${checked.length}` : "—"]].map(([l, v], i) => <li key={i} className="rounded-xl bg-muted/60 p-3"><p className="font-display text-xl font-semibold tabular-nums">{users ? v : "…"}</p><p className="text-[11px] leading-tight text-muted-foreground">{l}</p></li>)}
      </ol>
      <p className="mt-2 text-[11px] text-muted-foreground">{t("«Con bóveda» cuenta solo las cuentas revisadas. Toca «Revisar saldos» para comprobarlas.")}</p>
    </div>

    <div className="space-y-3">
      <div className="flex gap-2">
        <label className="relative flex-1"><span className="sr-only">{t("Buscar")}</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Buscar por nombre, correo o código")} className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm" /></label>
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label={t("Actualizar")} onClick={() => void load()} disabled={busy}>{busy ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}</Button>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{FILTERS.map((f) => <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>{t(f.label)}</button>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t("{n} cuentas", { n: String(shown.length) })}</span>
        <Button size="sm" variant="secondary" disabled={!users || !!checking} onClick={() => void checkAll()}>{checking ? <><Loader2 className="animate-spin" size={14} />{checking.done}/{checking.total}</> : <><Wallet size={14} />{t("Revisar saldos")}</>}</Button>
      </div>
      {err && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}
      {!users && !err && <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t("Cargando…")}</p>}
      {users && shown.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{(filter === "vault" || filter === "nodeposit") && !checked.length ? t("Primero toca «Revisar saldos».") : t("No hay cuentas con este filtro.")}</p>}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {shown.slice(0, 200).map((u) => { const on = isOnline(u.lastSeen, now); const h = u.wallet ? holdings[u.wallet] : undefined; return <li key={u.id}>
          <button type="button" onClick={() => setOpen(u)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-secondary">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${on ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-muted-foreground/30"}`} aria-label={on ? t("Conectado") : undefined} />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{u.name || u.email || (u.wallet ? short(u.wallet) : t("Sin nombre"))}</span><span className="block truncate text-xs text-muted-foreground">{u.name && u.email ? u.email : t("Registro: {d}", { d: u.createdAt ? new Date(u.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short", year: "2-digit" }) : "—" })}</span></span>
            <span className="flex shrink-0 flex-col items-end gap-1 text-right"><span className="text-xs tabular-nums text-muted-foreground">{on ? <span className="font-semibold text-primary">{t("En línea")}{u.screen ? ` · ${u.screen}` : ""}</span> : when(u.lastSeen)}</span>
              <span className="flex items-center gap-1 text-muted-foreground">{u.recharged && <Sparkles size={12} aria-label={t("Recargó")} />}{u.telegram && <Send size={12} aria-label="Telegram" />}{u.autopilot && <Zap size={12} aria-label={t("Piloto automático")} />}{h && <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold">{h.vaults > 0 ? t("{n} bóv.", { n: String(h.vaults) }) : `$${h.usdc.toFixed(0)}`}</span>}</span></span>
          </button></li>; })}
      </ul>
      {shown.length > 200 && <p className="text-center text-xs text-muted-foreground">{t("Mostrando 200. Usa el buscador para encontrar más.")}</p>}
    </div>

    <Dialog open={!!open} onOpenChange={(o) => { if (!o) { setOpen(null); setCopied(false); } }}>
      <ActionSheetContent>{open && (() => { const u = open; const h = u.wallet ? holdings[u.wallet] : undefined; const row = (l: string, v: ReactNode) => <div className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0"><span className="text-muted-foreground">{l}</span><span className="min-w-0 truncate text-right font-medium">{v}</span></div>; return <>
        <DialogTitle className="flex items-center gap-2 pr-10 font-display text-xl"><Users size={18} className="text-primary" />{u.name || u.email || t("Cuenta")}</DialogTitle>
        <DialogDescription className="text-xs">{isOnline(u.lastSeen, now) ? t("En línea ahora") : t("Última vez: {d}", { d: when(u.lastSeen) })}</DialogDescription>
        <div>
          {row(t("Correo"), u.email ? <a className="text-primary underline" href={`mailto:${u.email}`}>{u.email}</a> : "—")}
          {row(t("Registro"), u.createdAt ? new Date(u.createdAt).toLocaleString(locale) : "—")}
          {row(t("Pantalla"), u.screen ?? "—")}
          {row(t("Recargó dólares"), u.recharged ? t("Sí") : t("No"))}
          {row("Telegram", u.telegram ? t("Conectado") : t("No"))}
          {row(t("Piloto automático"), u.autopilot ? t("Activo") : t("No"))}
          {row(t("Código de socio"), u.affiliate ?? "—")}
          {row(t("Saldo"), h ? `$${h.usdc.toFixed(2)} · ${t("{n} bóvedas", { n: String(h.vaults) })}` : u.wallet ? <button type="button" className="text-primary underline" onClick={() => void checkOne(u.wallet!)}>{t("Ver saldo")}</button> : "—")}
        </div>
        {u.wallet && <Button variant="outline" className="w-full" onClick={() => { void navigator.clipboard?.writeText(u.wallet!).then(() => setCopied(true)); }}>{copied ? <><Check size={16} />{t("Copiado")}</> : <><Copy size={16} />{t("Copiar cartera")} · {short(u.wallet)}</>}</Button>}
      </>; })()}</ActionSheetContent>
    </Dialog>
  </div>;
}
