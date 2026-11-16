import { useEffect, useRef, useState } from "react";
import { useRealWallet } from "@/hooks/use-real-wallet";
import { isDlmmVault } from "@/lib/solana-data";
import { shouldAutoEnableAutopilot } from "@/lib/autopilot";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, LoaderCircle, ShieldCheck, Timer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { autopilotStatus, disableAutopilot, enableAutopilot, type AutopilotStatus } from "@/lib/autopilot.functions";

/** Shared cached Autopilot state for the signed-in wallet (only for the protected BÓVEDA wallet). */
export function useAutopilot() {
  const session = useBovedaSession();
  const wallet = session.walletAddress ?? "";
  const read = useServerFn(autopilotStatus);
  const available = !!session.autopilot && !!wallet;
  const query = useQuery({ queryKey: ["autopilot", wallet], queryFn: () => read({ data: { wallet } }), enabled: available, staleTime: 60_000, retry: 1 });
  return { available, wallet, status: query.data ?? null, session };
}

/**
 * Range vaults run on Autopilot by default: once a signed-in BÓVEDA wallet holds a range position and never recorded a
 * choice, attach the rebalance-only permission and enable it (one try per session). Telegram and the bell then inform.
 */
export function AutopilotDefault() {
  const t = useT();
  const queryClient = useQueryClient();
  const { available, wallet, status, session } = useAutopilot();
  const enable = useServerFn(enableAutopilot);
  const real = useRealWallet(available ? wallet : null);
  const hasRange = (real.data?.success ? real.data.data.positions : []).some((p) => isDlmmVault(p.vaultId) && !p.locked);
  const tried = useRef(false);
  useEffect(() => {
    if (tried.current || !available || !status || !shouldAutoEnableAutopilot({ hasRangePosition: hasRange, enrolled: status.enrolled })) return;
    const key = `boveda:autopilot-default:${wallet}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { return; }
    tried.current = true;
    void (async () => {
      try {
        try { await session.autopilot!.grant(); } catch (e) { if (!/already|exist/i.test(e instanceof Error ? e.message : "")) return; }
        queryClient.setQueryData(["autopilot", wallet], await enable({ data: { wallet, auto: true } }));
        notify("success", t("Piloto automático activado"), t("Recentramos tus bóvedas de rango por ti"));
      } catch { /* the manual switch and range alerts remain available */ }
    })();
  }, [available, status, hasRange, wallet, session, enable, queryClient, t]);
  return null;
}

function ago(iso: string, t: ReturnType<typeof useT>) {
  const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  return m < 60 ? t("hace {n} min", { n: m }) : m < 1440 ? t("hace {n} h", { n: Math.round(m / 60) }) : t("hace {n} d", { n: Math.round(m / 1440) });
}

/** One-switch Autopilot for range vaults: one Privy permission, then BÓVEDA re-centres out-of-range positions without asking for signatures. */
export function AutopilotToggle({ className }: { className?: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const { available, wallet, status, session } = useAutopilot();
  const enable = useServerFn(enableAutopilot), disable = useServerFn(disableAutopilot);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!available) return null;
  const on = !!status?.enabled;
  const store = (s: AutopilotStatus) => queryClient.setQueryData(["autopilot", wallet], s);

  async function activate() {
    if (pending) return;
    setPending(true); setError(null);
    try {
      try { await session.autopilot!.grant(); }
      catch (e) { if (!/already|exist/i.test(e instanceof Error ? e.message : "")) throw new Error(t("No se completó el permiso. Inténtalo de nuevo.")); }
      store(await enable({ data: { wallet } }));
      notify("success", t("Piloto automático activado"), t("Recentramos tus bóvedas de rango por ti"));
      setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : t("No se pudo activar el piloto automático. Inténtalo de nuevo.")); }
    finally { setPending(false); }
  }
  async function deactivate() {
    if (pending) return;
    setPending(true);
    try {
      await session.autopilot!.revoke().catch(() => undefined);
      store(await disable({ data: { wallet } }));
      notify("success", t("Piloto automático apagado"), t("Te avisaremos para que rebalancees con un toque"));
    } catch { notify("error", t("No se pudo apagar el piloto automático"), t("Inténtalo de nuevo")); }
    finally { setPending(false); }
  }

  return <>
    <div className={`flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 ${className ?? ""}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Bot size={18} aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t("Piloto automático")}</p>
        <p className="text-xs leading-4 text-muted-foreground">{on ? (status?.lastRebalanceAt ? t("Activo · último rebalanceo {when}", { when: ago(status.lastRebalanceAt, t) }) : t("Activo · la recentramos por ti, sin firmas")) : t("La recentramos por ti si sale de rango, sin firmas")}</p>
      </div>
      {pending ? <LoaderCircle className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-label={t("Procesando")} />
        : <Switch checked={on} aria-label={t("Piloto automático")} onCheckedChange={(v) => { if (v) { setError(null); setOpen(true); } else void deactivate(); }} />}
    </div>
    {open && <Dialog open onOpenChange={(o) => { if (!o && !pending) setOpen(false); }}><ActionSheetContent closeLabel={t("Cerrar")}>
      <DialogTitle className="flex items-center gap-2"><Bot size={20} className="text-primary" aria-hidden />{t("Activa el piloto automático")}</DialogTitle>
      <DialogDescription>{t("Olvídate de rebalancear: si el precio sale de tu rango, la volvemos a centrar por ti para que siga generando.")}</DialogDescription>
      <ul className="grid gap-3 text-sm">
        <li className="flex gap-3"><Zap size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden /><span>{t("Si pasa más de 5 minutos fuera de rango, la recentramos sola. Sin firmas y sin comisión.")}</span></li>
        <li className="flex gap-3"><Timer size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden /><span>{t("Máximo una vez cada 12 horas y solo con el precio estable. Si no, te avisamos para que decidas tú.")}</span></li>
        <li className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden /><span>{t("El permiso solo sirve para rebalancear: no puede retirar ni enviar tu dinero. Lo apagas cuando quieras.")}</span></li>
      </ul>
      <Button size="lg" className="font-bold" disabled={pending} onClick={() => void activate()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Bot className="mr-2 h-4 w-4" />}{t("Activar piloto automático")}</Button>
      {error && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
      {error && !pending && <Button variant="outline" onClick={() => setOpen(false)}>{t("Cerrar")}</Button>}
    </ActionSheetContent></Dialog>}
  </>;
}
