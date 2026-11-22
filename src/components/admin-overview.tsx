import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, AlertTriangle, ChevronRight, Fuel, Inbox, Lightbulb, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { getAdminOverview } from "@/lib/admin-users.functions";
import { getSystemStatus } from "@/lib/system-status.functions";
import { listMailbox } from "@/lib/mailbox.functions";
import { AFFILIATE_PAYOUT_WALLET } from "@/lib/affiliate";
import { readTokenBalance, SOL_MINT } from "@/lib/wallet-actions";
import { TOPUP_TRIGGER_LAMPORTS } from "@/lib/treasury-topup";
import type { AdminOverview as Overview } from "@/lib/admin-users";

export type AdminCounts = { overview: Overview | null; unreadMail: number | null; mailMore: boolean; servicesDown: number | null; solLow: boolean | null };

/** Loads the Control Panel headline counters once a minute; shared by the summary cards and the menu badges. */
export function useAdminCounts(): AdminCounts {
  const session = useBovedaSession();
  const overviewFn = useServerFn(getAdminOverview);
  const statusFn = useServerFn(getSystemStatus);
  const mailFn = useServerFn(listMailbox);
  const [c, setC] = useState<AdminCounts>({ overview: null, unreadMail: null, mailMore: false, servicesDown: null, solLow: null });
  useEffect(() => {
    let on = true, n = 0, lastMail: Awaited<ReturnType<typeof mailFn>> | null = null;
    const run = async () => {
      const withMail = n++ % 5 === 0;
      const token = await session.getAccessToken?.().catch(() => null);
      const [o, s, m, sol] = await Promise.all([
        token ? overviewFn({ data: { token } }).catch(() => null) : null,
        statusFn().catch(() => null),
        token && withMail ? mailFn({ data: { token, q: "in:inbox is:unread" } }).catch(() => null) : lastMail,
        readTokenBalance(AFFILIATE_PAYOUT_WALLET, SOL_MINT).catch(() => null),
      ]);
      if (!on) return;
      lastMail = m;
      setC({
        overview: o?.success ? o.data : null,
        unreadMail: m?.success ? m.items.length : null, mailMore: !!(m?.success && m.next),
        servicesDown: s ? s.services.filter((x) => x.state !== "up").length : null,
        solLow: sol === null ? null : sol < TOPUP_TRIGGER_LAMPORTS,
      });
    };
    void run();
    const id = setInterval(() => void run(), 60_000);
    return () => { on = false; clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return c;
}

/** «Resumen»: what needs attention first; every card jumps to the section that resolves it. */
export function AdminOverviewCards({ counts, go }: { counts: AdminCounts; go: (section: string) => void }) {
  const t = useT();
  const o = counts.overview;
  const dash = "…";
  const usd = (raw: string) => `$${(Number(raw) / 1e6).toFixed(2)}`;
  const Card = ({ icon: Icon, label, value, hint, to, alert }: { icon: LucideIcon; label: string; value: string | number; hint?: string | undefined; to: string; alert?: boolean }) =>
    <button type="button" onClick={() => go(to)} className={`group flex flex-col rounded-2xl border p-4 text-left transition-colors hover:bg-secondary ${alert ? "border-destructive/50 bg-destructive/5" : "border-border bg-card"}`}>
      <span className="flex items-center justify-between text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Icon size={14} className={alert ? "text-destructive" : "text-primary"} />{label}</span><ChevronRight size={14} className="opacity-50 group-hover:opacity-100" /></span>
      <span className={`mt-2 font-display text-2xl font-semibold tabular-nums ${alert ? "text-destructive" : ""}`}>{value}</span>
      {hint && <span className="mt-0.5 text-[11px] text-muted-foreground">{hint}</span>}
    </button>;
  return <div className="space-y-6">
    <section aria-label={t("Usuarios")}>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Usuarios")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card icon={Users} label={t("Conectados ahora")} value={o ? o.onlineUsers : dash} hint={o ? t("+{n} visitantes", { n: String(o.onlineVisitors) }) : undefined} to="usuarios" />
        <Card icon={Activity} label={t("Activos en 24 h")} value={o ? o.activeUsers24h : dash} hint={o ? t("+{n} visitantes", { n: String(o.visitors24h) }) : undefined} to="usuarios" />
      </div>
    </section>
    <section aria-label={t("Necesita atención")}>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Necesita atención")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card icon={Wallet} label={t("Pagos a socios")} value={o ? usd(o.pendingPayoutRaw) : dash} hint={o ? t("{n} listos para pagar", { n: String(o.payoutsDue) }) : undefined} to="negocio" alert={!!o && o.payoutsDue > 0} />
        <Card icon={Fuel} label={t("Reserva de tesorería")} value={counts.solLow === null ? dash : counts.solLow ? t("Nivel bajo") : t("Nivel correcto")} to="negocio" alert={!!counts.solLow} />
        <Card icon={Inbox} label={t("Correos sin leer")} value={counts.unreadMail === null ? dash : `${counts.unreadMail}${counts.mailMore ? "+" : ""}`} to="comunicaciones" alert={!!counts.unreadMail} />
        <Card icon={Lightbulb} label={t("Sugerencias nuevas")} value={o ? o.unreadSuggestions : dash} to="comunicaciones" alert={!!o && o.unreadSuggestions > 0} />
        <Card icon={counts.servicesDown ? AlertTriangle : Activity} label={t("Estado del sistema")} value={counts.servicesDown === null ? dash : counts.servicesDown ? t("{n} con fallas", { n: String(counts.servicesDown) }) : t("Todo bien")} to="seguridad" alert={!!counts.servicesDown} />
      </div>
    </section>
  </div>;
}
