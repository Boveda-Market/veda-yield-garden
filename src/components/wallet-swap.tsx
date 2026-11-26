import { PoweredBy } from "@/components/powered-by";
import { ServiceFeeLabel } from "@/components/service-fee-label";
import { ActionSuccess } from "@/components/action-success";
import { WalletTokenPicker } from "@/components/wallet-token-picker";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { quoteSwap, SWAP_TOKENS, swapSpendable, swapToken, toTokenUnits, type SwapQuote } from "@/lib/wallet-actions";

const QUOTE_TTL = 30_000;

type Props = {
  balances: Record<string, bigint | undefined>;
  initialFrom?: string;
  initialAmount?: string;
  busy: boolean;
  onConfirm: (quote: SwapQuote) => Promise<unknown>;
  compact?: boolean;
  /** Rendered inside an action sheet: the sheet already shows the title. */
  sheet?: boolean;
  /** Tells the sheet when a live quote is ready to confirm, so closing it can explain where the money stays. */
  onReadyChange?: (ready: boolean) => void;
};

/** Quote-only requests never sign; only the reviewed, current input can be confirmed. Any pair; fee always in USDC. */
export function WalletSwap({ balances, initialFrom = "USDC", initialAmount = "", busy, onConfirm, compact = false, sheet = false, onReadyChange }: Props) {
  const t = useT();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialFrom === "USDC" ? "SOL" : "USDC");
  const [amount, setAmount] = useState(initialAmount);
  const [debounced, setDebounced] = useState(initialAmount);
  const [now, setNow] = useState(0);
  const [done, setDone] = useState<SwapQuote | null>(null);
  const units = toTokenUnits(amount, from);
  const balance = balances[from];
  const max = balance === undefined ? undefined : swapSpendable(balance, from);
  const format = (value: bigint | string, symbol: string) => {
    const d = swapToken(symbol).decimals;
    return (Number(value) / 10 ** d).toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: symbol === "USDC" ? 2 : Math.min(d, 6) });
  };
  const usd = (value: string) => `$${(Number(value) / 1e6).toLocaleString("en-US", { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(amount), 600);
    return () => clearTimeout(timer);
  }, [amount]);

  const quote = useQuery({
    queryKey: ["wallet-swap-quote", from, to, debounced],
    enabled: Boolean(units) && amount === debounced && !busy,
    queryFn: () => {
      const input = toTokenUnits(debounced, from);
      if (!input) throw new Error(t("Monto no válido"));
      return quoteSwap(from, to, input);
    },
    staleTime: QUOTE_TTL,
    refetchInterval: busy ? false : QUOTE_TTL,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const current = amount === debounced && quote.data?.from === from && quote.data.to === to && quote.data.amount === units ? quote.data : undefined;
  useEffect(() => { onReadyChange?.(!!current && !done); }, [current, done, onReadyChange]);
  useEffect(() => {
    if (!current) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [current]);
  const age = current ? Math.max(0, now - quote.dataUpdatedAt) : 0;
  const expired = Boolean(current) && age >= QUOTE_TTL;
  const secondsLeft = Math.max(0, Math.ceil((QUOTE_TTL - age) / 1000));
  const usdcBal = balances["USDC"];
  const feeShort = Boolean(current && from !== "USDC" && to !== "USDC" && BigInt(current.feeUsdc) > 0n && (usdcBal ?? 0n) < BigInt(current.feeUsdc));
  const insufficient = Boolean(units && max !== undefined && units > max) || feeShort;
  const loading = Boolean(units) && (amount !== debounced || quote.isFetching);
  const rate = current && units ? (Number(current.outAmount) / 10 ** swapToken(to).decimals) / (Number(units) / 10 ** swapToken(from).decimals) : null;

  /** Keeps only digits and one decimal separator, capped at the token's precision, so typing can't produce an invalid amount. */
  const sanitize = (raw: string) => {
    const d = swapToken(from).decimals;
    const [whole = "", ...rest] = raw.replace(/,/g, ".").replace(/[^\d.]/g, "").split(".");
    return rest.length ? `${whole || "0"}.${rest.join("").slice(0, d)}` : whole;
  };
  const clear = () => { setAmount(""); setDebounced(""); };
  const pick = (side: "from" | "to", symbol: string) => {
    const other = side === "from" ? to : from;
    let next = other;
    if (symbol === other) next = side === "from" ? from : to; // selecting the other side's token flips the pair
    if (symbol === next) next = SWAP_TOKENS.find((x) => x.symbol !== symbol)?.symbol ?? "USDC";
    if (side === "from") { setFrom(symbol); setTo(next); } else { setTo(symbol); setFrom(next); }
    clear();
  };
  const setPercent = (pct: bigint) => {
    if (max === undefined || max <= 0n) return;
    const d = BigInt(swapToken(from).decimals);
    const v = max * pct / 100n;
    const frac = (v % 10n ** d).toString().padStart(Number(d), "0").replace(/0+$/, "");
    setAmount(frac ? `${v / 10n ** d}.${frac}` : `${v / 10n ** d}`);
  };

  if (done) return <div className="mt-4"><ActionSuccess destination={null} title={t("Cambio enviado")} amount={{ value: format(done.outAmount, done.to), unit: done.to, label: "≈" }} body={`${t("Cambiaste {a} por aproximadamente {b}.", { a: `${format(done.amount, done.from)} ${done.from}`, b: `${format(done.outAmount, done.to)} ${done.to}` })} ${t("Tu saldo se actualizará en unos segundos.")}`} details={[{ label: t("Operación"), value: t("Cambio de moneda") }, { label: t("Pagaste"), value: `${format(done.amount, done.from)} ${done.from}` }, { label: t("Destino"), value: t("Tu billetera") }]} signature={null} doneLabel={t("Hacer otro cambio")} onClose={() => setDone(null)} /></div>;

  const select = (side: "from" | "to", value: string) => <WalletTokenPicker value={value} balances={balances} disabled={busy}
    label={side === "from" ? t("Moneda que pagas") : t("Moneda que recibes")} onChange={(symbol) => pick(side, symbol)} />;
  const pad = compact ? "p-3" : "p-4";

  return <div className={compact ? "space-y-2" : sheet ? "space-y-3" : "mt-4 space-y-3"} aria-busy={busy}>
    {!compact && !sheet && <h3 className="font-display text-lg">{t("Cambiar monedas")}</h3>}
    <div className="relative">
      <div className={`rounded-2xl border border-border bg-muted ${pad}`}>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <label htmlFor="swap-amount" className="font-medium">{t("Pagas")}</label>
          <div className="flex items-center gap-1.5">
            <Wallet className="size-3.5" /><span>{max === undefined ? "—" : format(max, from)} {from}</span>
            {([50n, 100n] as const).map((p) => <button key={String(p)} type="button" className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase hover:border-primary hover:text-primary disabled:opacity-50" disabled={busy || max === undefined || max <= 0n} onClick={() => setPercent(p)}>{p === 100n ? t("Máx") : "50%"}</button>)}
          </div>
        </div>
        <div className={`${compact ? "mt-2" : "mt-3"} flex items-center gap-3`}>
          {select("from", from)}
          <input id="swap-amount" size={1} inputMode="decimal" placeholder="0.00" value={amount} disabled={busy} onChange={(e) => setAmount(sanitize(e.target.value))} className={`min-w-0 flex-1 bg-transparent text-right font-display ${compact ? "text-2xl" : "text-3xl"} outline-none`} />
        </div>
        <p className="mt-1 h-4 text-right text-xs text-muted-foreground">{current && !loading ? usd(current.usdcValue) : ""}</p>
      </div>
      <div className="relative z-10 -my-3 flex justify-center"><button type="button" className="grid size-9 place-items-center rounded-full border-4 border-card bg-muted text-muted-foreground transition-colors hover:text-primary disabled:opacity-50" disabled={busy} aria-label={t("Invertir cambio")} title={t("Invertir cambio")} onClick={() => { setFrom(to); setTo(from); clear(); }}><ArrowDown className="size-4" /></button></div>
      <div className={`rounded-2xl border border-border bg-background ${pad}`} aria-live="polite">
        <div className="text-xs font-medium text-muted-foreground">{t("Recibes aproximadamente")}</div>
        <div className={`${compact ? "mt-2" : "mt-3"} flex items-center gap-3`}>
          {select("to", to)}
          <p className={`min-w-0 flex-1 truncate text-right font-display ${compact ? "text-2xl" : "text-3xl"} ${loading ? "text-muted-foreground" : ""}`}>{loading ? t("Cotizando…") : current ? format(current.outAmount, to) : "0.00"}</p>
        </div>
        <p className="mt-1 h-4 text-right text-xs text-muted-foreground">{current && !loading ? (from !== "USDC" && to !== "USDC" ? t("Comisión aparte en USDC") : t("Comisión ya descontada")) : ""}</p>
      </div>
    </div>

    {amount && !units && !/^[0.]*$/.test(amount) && <p role="alert" className="text-sm text-muted-foreground">{t("Monto no válido")}</p>}
    {insufficient && <p role="alert" className="text-sm text-muted-foreground">{feeShort ? t("Necesitas USDC para la comisión de este cambio.") : t("Saldo disponible insuficiente para esta cantidad")}</p>}
    {from === "SOL" && <p className="text-xs text-muted-foreground">{t("Guardamos 0.01 SOL para pagar los costos de red.")}</p>}

    {current && !loading && <>
      <div className="flex items-center justify-between text-sm"><span>1 {from} ≈ {rate?.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 6 })} {to}</span>
        <span className="text-xs text-muted-foreground">{expired ? t("Actualizando…") : t("Válida por {s}s", { s: String(secondsLeft) })}</span></div>
      <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all duration-1000" style={{ width: `${(secondsLeft / 30) * 100}%` }} /></div>
      <details className="rounded-xl border border-border px-3 py-2 text-sm">
        <summary className="cursor-pointer text-muted-foreground">{t("Ver detalles")}</summary>
        <dl className="mt-2 space-y-2">
          <div className="flex justify-between gap-2"><dt><ServiceFeeLabel t={t} /></dt><dd>{format(current.feeUsdc, "USDC")} USDC</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("Mínimo a recibir")}</dt><dd>{current.minimum ? `${format(current.minimum, to)} ${to}` : "—"}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("Protección de precio")}</dt><dd>0.5%</dd></div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">{t("Los cambios no tienen comisión de Bóveda Market. Solo pagas el precio del mercado.")}</p>
      </details>
    </>}
    {quote.isError && amount === debounced && <p role="alert" className="text-sm text-muted-foreground">{t(quote.error.message)}</p>}
    {quote.isError && <Button variant="outline" className="w-full" disabled={busy || !units} onClick={() => void quote.refetch()}><RefreshCw />{t("Actualizar cotización")}</Button>}
    <Button className="w-full" size={compact ? "default" : "lg"} disabled={busy || loading || !current || expired || insufficient || max === undefined} onClick={() => {
      if (!current || Date.now() - quote.dataUpdatedAt >= QUOTE_TTL || insufficient || busy) return;
      void onConfirm(current).then(() => { setDone(current); clear(); }).catch(() => {});
    }}>{busy ? t("Procesando…") : t("Confirmar y firmar cambio")}</Button>
    {!compact && <PoweredBy brand="jupiter" asLink label="Powered by" className="pt-1" />}
  </div>;
}
