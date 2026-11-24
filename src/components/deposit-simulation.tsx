import { useT } from "@/lib/i18n";
import { useRealWallet } from "@/hooks/use-real-wallet";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { TapAmount } from "@/components/ui/tap-amount";
import { MoveSteps } from "@/components/move-steps";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { openVaultPosition, simulationDisplay } from "@/lib/deposit-simulation";
import type { Vault } from "@/lib/vaults";
import { PilotDeposit } from "@/components/pilot-deposit";
import { clearResumeDeposit } from "@/lib/resume-deposit";
import { BuyUsdc } from "@/components/buy-usdc";
import { RangeAlertsGate } from "@/components/range-alerts-gate";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits } from "@/lib/onboarding";
import { poolYieldOptions } from "@/lib/pool-yield";
import { Wallet } from "lucide-react";
import { HotBanner } from "@/components/hot-vault-card";
import { vaultSkin } from "@/components/vault-skin";
import { isDlmmVault } from "@/lib/solana-data";
import { FundsKeptCard } from "@/components/funds-kept-card";
import { useActivationQuote } from "@/hooks/use-activation-quote";
import { ACTIVATION_FEE_MICRO } from "@/lib/gas-refill";
import { LoginSheet } from "@/components/login-nudge";
import { depositQuote, QUOTE_PRESETS } from "@/lib/deposit-quote";
import { fetchPoolStats, coinLabel } from "@/lib/pool-stats";
import { formatCoinPrice } from "@/lib/format-price";

const MAX_MICRO = 5_000_000_000n;
const microToText = (v: bigint) => { const w = v / 1_000_000n; const f = (v % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, ""); return f ? `${w}.${f}` : `${w}`; };

export function DepositSimulation({ vault, wallet, onClose, initialAmount = "", position: givenPosition, migrate = false, resumed = false }: { vault: Vault; wallet: string | null; onClose: () => void; initialAmount?: string; position?: string; migrate?: boolean; resumed?: boolean }) {
  const t = useT();
  const [amount, setAmount] = useState(initialAmount);
  // One position per vault: a deposit or move into a vault the person already has open adds to that position.
  const real = useRealWallet(wallet);
  const position = givenPosition ?? (real.data?.success ? openVaultPosition(real.data.data.positions, vault.id) : null) ?? undefined;
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [kept, setKept] = useState(false);
  const [login, setLogin] = useState(false);
  useEffect(() => { if (done) clearResumeDeposit(); }, [done]);
  const readWallet = useServerFn(getRealWallet);
  const balances = useQuery({ queryKey: ["my-wallet", wallet], enabled: !!wallet, queryFn: async () => {
    const r = await readWallet({ data: { wallet: wallet! } });
    if (!r.success) throw new Error(r.error);
    return { sol: decimalToUnits(r.data.sol, 9) ?? 0n, usdc: decimalToUnits(r.data.usdc, 6) ?? 0n };
  } });
  const activationQ = useActivationQuote(wallet, !migrate && isDlmmVault(vault.id), false, vault.id);
  const yieldQ = useQuery(poolYieldOptions(vault.pool));
  const apr = yieldQ.data?.apr;
  const statsQ = useQuery({ queryKey: ["dexscreener-pool-stats", vault.pool], queryFn: ({ signal }) => fetchPoolStats(vault.pool, signal), staleTime: 60_000, retry: 1 });
  const coin = coinLabel(statsQ.data?.baseSymbol ?? yieldQ.data?.symbolX, "la moneda");
  const coinPrice = statsQ.data?.price ?? null;
  let breakdown: ReturnType<typeof simulationDisplay> | null = null;
  try { breakdown = simulationDisplay(amount, migrate); } catch { /* Incomplete input. */ }
  const usdc = balances.data?.usdc;
  const typed = decimalToUnits(amount || "0", 6);
  const overBalance = usdc != null && typed != null && typed > usdc;
  const pick = (pct: bigint) => { if (usdc == null) return; const cap = usdc < MAX_MICRO ? usdc : MAX_MICRO; setAmount(microToText((cap * pct) / 100n)); };
  const clean = (v: string) => { const s = v.replace(/,/g, ".").replace(/[^\d.]/g, ""); const [w, ...rest] = s.split("."); return rest.length ? `${w}.${rest.join("").slice(0, 6)}` : (w ?? ""); };

  // Activation on top when the balance covers it; new positions pay the vault market's fee on the swapped half.
  const activationPending = !migrate && isDlmmVault(vault.id) && !!wallet && activationQ.isPending;
  // Visitors arriving from the home have no account yet: they will pay the one-time new-account activation. Returning accounts use the live server quote (no charge when already active).
  const guestCharge = !wallet && !migrate && isDlmmVault(vault.id) ? ACTIVATION_FEE_MICRO : null;
  const quote = typed != null && typed > 0n ? depositQuote(typed, guestCharge ?? activationQ.data?.charge ?? null, guestCharge ?? activationQ.data?.fee ?? 0n, { balanceMicro: guestCharge != null && typed != null ? typed + guestCharge : usdc ?? null, feePct: yieldQ.data?.feePct ?? null, swaps: !position }) : null;
  const usd = (m: bigint) => `$${(Number(m) / 1e6).toFixed(2)}`;
  const hot = Boolean(vault.badge) && !migrate;
  const showBanner = hot && !done;
  const step3 = resumed && !done && usdc != null && usdc > 0n;
  return <Dialog open onOpenChange={(open) => { if (open || busy) return; if (step3 && !kept) { clearResumeDeposit(); setKept(true); } else onClose(); }}><ActionSheetContent closeLabel={t("Cerrar")} className={hot && !kept ? `border-hot/40 shadow-[var(--shadow-hot)] ${vaultSkin(vault.id)}` : undefined}>
    {kept ? <FundsKeptCard amountMicro={usdc} onDone={onClose} /> : <>
    {showBanner && <HotBanner vault={vault} className="-mx-5 -mt-2 rounded-t-3xl pr-14 sm:-mx-6 sm:-mt-6">
      <span className="flex items-center gap-1 rounded-full bg-hot-surface/70 px-2 py-0.5 text-[10px] font-bold uppercase"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live shadow-[0_0_6px_var(--live)] motion-reduce:animate-none" />{t("En vivo")}</span>
    </HotBanner>}
    <DialogTitle className={done || showBanner ? "sr-only" : undefined}>{migrate ? t("Cambiar a {v}", { v: t(vault.name) }) : <>{position ? t("Depositar más ·") : t("Depositar ·")}{" "}{t(vault.name)}</>}</DialogTitle>
    <DialogDescription className={done ? "sr-only" : undefined}>{migrate ? t("Depositamos en la nueva bóveda lo que moviste.") : t("Elige cuánto quieres depositar y confirma.")}</DialogDescription>
    {migrate && !done && <MoveSteps current={2} to={t(vault.name)} />}
    {migrate && !done && <p className="text-center font-display text-3xl font-bold tabular-nums">${amount || "—"}</p>}
    {!done && !migrate && <>
    <div className={hot ? "flex items-center justify-between rounded-xl border border-hot/30 bg-hot-surface p-3 text-sm text-hot-foreground" : "flex items-center justify-between rounded-xl bg-muted p-3 text-sm"}>
      <span className={hot ? "text-xs font-semibold uppercase tracking-wide text-hot-muted" : "text-muted-foreground"}>{t("Intereses estimados")}</span>
      <span className="font-display text-lg font-bold text-primary">{apr == null ? "—" : `${apr.toFixed(2)}% APR`}</span>
    </div>
    <div className="grid gap-2 rounded-xl border border-border p-4">
      {wallet && <button type="button" disabled={busy || !usdc} onClick={() => pick(100n)} className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-left disabled:cursor-default"><span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Wallet size={14} className="text-primary" />{t("Disponible para depositar")}</span><span className="font-display text-lg font-bold tabular-nums text-foreground">{usdc == null ? "…" : microToText(usdc)} <span className="text-xs font-semibold text-muted-foreground">$</span></span></button>}
      <span className="text-xs text-muted-foreground">{t("Cantidad ($)")}</span>
      <TapAmount label={t("Cantidad ($)")} prefix="$" value={amount} disabled={busy} onChange={(v) => setAmount(clean(v))} />
      {usdc === 0n || !wallet ? <div className="grid grid-cols-4 gap-2">{QUOTE_PRESETS.map((v) => <Button key={v} type="button" size="sm" variant={amount === v ? "default" : "secondary"} disabled={busy} onClick={() => setAmount(v)}>${v}</Button>)}</div> : <div className="grid grid-cols-4 gap-2">{([25n, 50n, 75n, 100n] as const).map((p) => <Button key={p.toString()} type="button" size="sm" variant="secondary" disabled={busy || !usdc} onClick={() => pick(p)}>{p === 100n ? t("Máx") : `${p}%`}</Button>)}</div>}
      <p className="text-xs text-muted-foreground">{migrate ? t("Traslado entre bóvedas: el detalle aparece antes de confirmar.") : t("Entre $1 y $5,000.")}</p>
      {overBalance && <p role="alert" className="text-xs text-muted-foreground">{t("No tienes suficientes dólares para esta cantidad.")}</p>}
      {!busy && wallet && (overBalance || usdc === 0n) && <div className={hot ? "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hot/40 bg-hot/10 p-3 text-xs" : "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs"}><span>{hot ? t("Estás a un paso de comenzar. Deposita dólares para entrar a la {v}.", { v: t(vault.name) }) : t("Estás a un paso de comenzar. Añade dólares y sigue aquí mismo.")}</span><BuyUsdc className="w-full" hot={hot} resume={{ vaultId: vault.id, amount: typed != null ? amount : "", ...(position ? { position } : {}), ...(migrate ? { migrate: true } : {}) }} needMicro={overBalance && typed != null && usdc != null ? typed - usdc : undefined} label={t("Continuar para depositar")} /></div>}
    </div>
    {breakdown && quote && <dl aria-label={t("Cotización en vivo")} className="grid gap-2 rounded-xl bg-muted p-4 text-sm">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"><span className={`h-1.5 w-1.5 rounded-full bg-live ${activationQ.isFetching ? "animate-pulse" : ""}`} />{t("Cotización en vivo")}</p>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Depósito")}</dt><dd className="tabular-nums">{usd(quote.net)}</dd></div>
      {activationPending ? <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Activación y reserva")}</dt><dd className="text-muted-foreground">{t("Calculando…")}</dd></div> : <>
      {quote.fee > 0n && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Activación de cuenta digital (única vez)")}</dt><dd className="tabular-nums">{quote.onTop ? "+" : "−"}{usd(quote.fee)}</dd></div>}
      {quote.reserve > 0n && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Reserva de operaciones")}</dt><dd className="tabular-nums">{quote.onTop ? "+" : "−"}{usd(quote.reserve)}</dd></div>}
      {quote.fee === 0n && quote.reserve === 0n && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Activación")}</dt><dd className="font-semibold text-primary">{t("Gratis")}</dd></div>}
      </>}
      {quote.swapCost > 0n ? <div className="grid gap-1.5 rounded-lg border border-border bg-background/60 p-3">
        <p className="text-xs font-semibold">{t("Compra de {c}", { c: coin })}</p>
        <div className="flex justify-between gap-3 text-xs"><dt className="text-muted-foreground">{t("Se queda en dólares digitales")}</dt><dd className="tabular-nums">{usd(quote.net - quote.net / 2n)}</dd></div>
        <div className="flex justify-between gap-3 text-xs"><dt className="text-muted-foreground">{t("Se usa para comprar {c}", { c: coin })}</dt><dd className="tabular-nums">{usd(quote.net / 2n)}</dd></div>
        {coinPrice != null && <div className="flex justify-between gap-3 text-xs"><dt className="text-muted-foreground">{t("Recibes aprox.")}</dt><dd className="tabular-nums">{(Number(quote.net / 2n - quote.swapCost) / 1e6 / coinPrice).toLocaleString("en-US", { maximumSignificantDigits: 4 })} {coin}</dd></div>}
        {coinPrice != null && <div className="flex justify-between gap-3 text-xs"><dt className="text-muted-foreground">{t("Precio de 1 {c}", { c: coin })}</dt><dd className="tabular-nums">{formatCoinPrice(coinPrice)}</dd></div>}
        <div className="flex justify-between gap-3 text-xs"><dt className="text-muted-foreground">{t("Comisión del cambio (estimada)")}</dt><dd className="tabular-nums">−{usd(quote.swapCost)}</dd></div>
        <p className="text-[11px] leading-4 text-muted-foreground">{t("La bóveda trabaja con dos monedas: mitad dólares digitales y mitad {c}. Por eso compramos {c} por ti en este mismo paso, sin firmas extra.", { c: coin })}</p>
      </div> : null}
      <div className="flex justify-between gap-3 border-t border-border pt-2"><dt className="font-semibold">{t("Sale de tu billetera")}</dt><dd className="tabular-nums font-semibold">{usd(quote.total)}</dd></div>
      <div className="flex justify-between gap-3"><dt className="font-semibold">{t("Llega a tu bóveda")}</dt><dd className="font-display text-lg font-bold tabular-nums text-primary">~{usd(quote.inVault)}</dd></div>
      <p className="text-[11px] leading-4 text-muted-foreground">{quote.onTop ? t("La activación se paga aparte, así tu depósito entra completo. ") : quote.fee > 0n ? t("No alcanza para pagar la activación aparte, así que sale del mismo depósito. ") : ""}{t("Estimado con el precio actual.")}</p>
    </dl>}
    {!position && !migrate && <p role="note" className="rounded-xl border border-border p-3 text-xs leading-5 text-muted-foreground">{t("Tu capital se combina con la otra moneda de la bóveda y su valor fluctuará con el precio de mercado, mientras acumulas intereses en cada operación.")} <a href="/faq#vaults-fluctuation" className="underline">{t("¿Por qué cambia mi balance?")}</a></p>}
    </>}
    {!done && !migrate && isDlmmVault(vault.id) && <RangeAlertsGate />}
    {/* First vault only (first-account activation fee quoted): keep the one-tap promise in view right above the confirm button. */}
    {!done && !busy && !position && !migrate && activationQ.data?.fee === ACTIVATION_FEE_MICRO && <OneTapNote />}
    <div data-sheet-actions={done ? undefined : ""} className={done ? undefined : "sticky -bottom-5 z-10 -mx-5 -mb-5 grid gap-2 border-t border-border bg-background/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6"}>{wallet ? <PilotDeposit usdc={usdc} autoStart={migrate} vaultId={vault.id} amount={amount} position={position} migrate={migrate} onBusyChange={setBusy} onAmountFit={setAmount} onClose={onClose} onDoneChange={setDone} /> : <><Button type="button" className="w-full" size="lg" onClick={() => { try { sessionStorage.setItem("boveda:pending-deposit", vault.id); sessionStorage.setItem("boveda:pending-deposit:amount", amount); } catch { /* storage blocked */ } setLogin(true); }}>{t("Confirmar depósito")}</Button><p className="text-center text-xs text-muted-foreground">{t("Esta es la cotización de una cuenta nueva. Al entrar te traemos de vuelta aquí.")}</p><LoginSheet open={login} onOpenChange={setLogin} title={t("Entra para confirmar tu depósito")} body={t("Al entrar te llevamos directo a {v} para depositar.", { v: t(vault.name) })} /></>}</div>
    {step3 && !busy && <Button type="button" variant="ghost" className="w-full" onClick={() => { clearResumeDeposit(); setKept(true); }}>{t("Cancelar")}</Button>}
    </>}
  </ActionSheetContent></Dialog>;
}

/** One-tap promise shown only on the person's first vault deposit. */
export function OneTapNote() {
  const t = useT();
  return <p role="note" className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm leading-5">⚡ <strong>{t("Abre tu bóveda en un solo toque.")}</strong> {t("El sistema te guía, compra las monedas y hace todo por ti.")}</p>;
}
