import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeftRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale, useT } from "@/lib/i18n";
import { quoteSwap, spendable, toBaseUnits, type SwapQuote, type WalletAsset } from "@/lib/wallet-actions";

type Props = {
  balance: bigint | undefined;
  asset: WalletAsset;
  onAssetChange: (asset: WalletAsset) => void;
  busy: boolean;
  onConfirm: (quote: SwapQuote) => Promise<void>;
};

/** Quote-only requests never sign; only the reviewed, current input can be confirmed. */
export function WalletSwap({ balance, asset, onAssetChange, busy, onConfirm }: Props) {
  const t = useT();
  const locale = useLocale();
  const [amount, setAmount] = useState("");
  const [debounced, setDebounced] = useState("");
  const [now, setNow] = useState(0);
  const units = toBaseUnits(amount, asset);
  const output = asset === "SOL" ? "USDC" : "SOL";
  const max = balance === undefined ? undefined : spendable(balance, asset);
  const format = (value: bigint | string, token: WalletAsset) =>
    (Number(value) / 10 ** (token === "SOL" ? 9 : 6)).toLocaleString(locale, { maximumFractionDigits: token === "SOL" ? 9 : 6 });

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(amount), 600);
    return () => clearTimeout(timer);
  }, [amount]);

  const quote = useQuery({
    queryKey: ["wallet-swap-quote", asset, debounced],
    enabled: Boolean(units) && amount === debounced && !busy,
    queryFn: () => {
      const input = toBaseUnits(debounced, asset);
      if (!input) throw new Error(t("Monto no válido"));
      return quoteSwap(asset, input);
    },
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const current = amount === debounced && quote.data?.asset === asset && quote.data.amount === units ? quote.data : undefined;
  useEffect(() => {
    if (!current) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [current]);
  const expired = Boolean(current) && now - quote.dataUpdatedAt >= 30_000;
  const insufficient = Boolean(units && max !== undefined && units > max);
  const loading = Boolean(units) && (amount !== debounced || quote.isFetching);
  const raw = current?.raw;
  const minimum = raw && typeof raw === "object" && "otherAmountThreshold" in raw &&
    typeof raw.otherAmountThreshold === "string" && /^\d+$/.test(raw.otherAmountThreshold)
    ? raw.otherAmountThreshold : null;
  const rate = current && units ? (Number(current.outAmount) / 10 ** (output === "SOL" ? 9 : 6)) / (Number(units) / 10 ** (asset === "SOL" ? 9 : 6)) : null;

  return <div className="mt-4 space-y-4" aria-busy={busy}>
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-display text-lg">{t("Cambiar monedas")}</h3>
      <Button size="icon" variant="outline" disabled={busy} aria-label={t("Invertir cambio")} title={t("Invertir cambio")} onClick={() => { setAmount(""); setDebounced(""); onAssetChange(output); }}><ArrowLeftRight /></Button>
    </div>
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm"><label htmlFor="swap-amount">{t("Pagas")}</label><strong>{asset}</strong></div>
      <div className="flex gap-2"><Input id="swap-amount" inputMode="decimal" placeholder="0.00" value={amount} disabled={busy} onChange={(e) => setAmount(e.target.value)} /><Button size="sm" variant="outline" className="h-10" disabled={busy || max === undefined || max <= 0n} onClick={() => {
        if (max === undefined) return;
        const decimals = asset === "SOL" ? 9 : 6;
        setAmount(`${max / 10n ** BigInt(decimals)}.${(max % 10n ** BigInt(decimals)).toString().padStart(decimals, "0")}`);
      }}>{t("Máx")}</Button></div>
      <p className="text-xs text-muted-foreground">{t("Disponible")}: {max === undefined ? "—" : format(max, asset)} {asset}</p>
      {amount && !units && <p role="alert" className="text-sm text-destructive">{t("Monto no válido")}</p>}
      {insufficient && <p role="alert" className="text-sm text-destructive">{t("Saldo insuficiente")}</p>}
      {asset === "SOL" && <p className="text-xs text-muted-foreground">{t("Guardamos 0.01 SOL para pagar los costos de red.")}</p>}
    </div>
    <ArrowDown className="mx-auto size-4 text-muted-foreground" aria-hidden="true" />
    <div className="min-h-24 border-y border-border py-4" aria-live="polite">
      <div className="flex items-center justify-between text-sm"><span>{t("Recibes aproximadamente")}</span><strong>{output}</strong></div>
      <p className="mt-1 break-words font-display text-2xl text-primary">{loading ? t("Cotizando…") : current ? `${format(current.outAmount, output)} ${output}` : "—"}</p>
      {current && !loading && <p className="mt-1 text-xs text-muted-foreground">{t("Comisión ya descontada")}</p>}
    </div>
    {current && !loading && <dl className="space-y-2 text-sm">
      <div className="flex flex-wrap justify-between gap-1"><dt className="text-muted-foreground">{t("Tipo de cambio estimado")}</dt><dd>1 {asset} ≈ {rate?.toLocaleString(locale, { maximumFractionDigits: 9 })} {output}</dd></div>
      <div className="flex flex-wrap justify-between gap-1"><dt className="text-muted-foreground">{t("Comisión BÓVEDA (1%)")}</dt><dd>{format(current.feeUsdc, "USDC")} USDC</dd></div>
      <div className="flex flex-wrap justify-between gap-1"><dt className="text-muted-foreground">{t("Mínimo a recibir")}</dt><dd>{minimum ? `${format(minimum, output)} ${output}` : "—"}</dd></div>
      <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("Protección de precio")}</dt><dd>0.5%</dd></div>
    </dl>}
    {quote.isError && amount === debounced && <p role="alert" className="text-sm text-destructive">{t(quote.error.message)}</p>}
    {expired && !loading && <p role="status" className="text-sm text-muted-foreground">{t("Actualiza la cotización antes de confirmar.")}</p>}
    <div className="flex flex-col gap-2">
      {(current || quote.isError) && <Button variant="outline" disabled={busy || loading || !units} onClick={() => void quote.refetch()}><RefreshCw />{t("Actualizar cotización")}</Button>}
      <Button className="w-full" disabled={busy || loading || !current || expired || insufficient || max === undefined} onClick={() => {
        if (!current || Date.now() - quote.dataUpdatedAt >= 30_000 || insufficient || busy) return;
        void onConfirm(current).then(() => { setAmount(""); setDebounced(""); }).catch(() => {});
      }}>{busy ? t("Procesando…") : t("Confirmar y firmar cambio")}</Button>
    </div>
    <p className="text-xs text-muted-foreground">{t("La cotización no mueve tus fondos. El costo de red se paga aparte en SOL y lo verás en tu wallet antes de firmar.")}</p>
  </div>;
}