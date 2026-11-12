import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CreditCard, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { getRealWallet } from "@/lib/solana.functions";
import { autoConvertLamports, decimalToUnits, GAS_KEEP_LAMPORTS, onboardingStep, SOL_EXCESS_MIN_USD } from "@/lib/onboarding";
import { buildSwap, quoteSwap, type SwapQuote } from "@/lib/wallet-actions";
import { Button } from "@/components/ui/button";
import { startCoinbaseBuy } from "@/lib/coinbase-offramp.functions";
import { holdSessionForExternalFlow } from "@/components/idle-logout";

type Receipt = { solIn: bigint; usdcOut: bigint; minimum: bigint | null; kept: bigint; signature: string };
const num = (v: bigint, d: number, max: number) => (Number(v) / 10 ** d).toLocaleString("en-US", { useGrouping: false, minimumFractionDigits: Math.min(2, max), maximumFractionDigits: max });

/** One-button funding: buy with card, then one tap converts everything above the network reserve to USDC and shows a receipt. */
export function StartGuide({ className }: { className?: string; onSwap?: () => void }) {
  const t = useT();
  const session = useBovedaSession();
  const queryClient = useQueryClient();
  const address = session.walletAddress;
  const read = useServerFn(getRealWallet);
  const cbBuy = useServerFn(startCoinbaseBuy);
  async function buyStarter() {
    setError(null);
    const tab = window.open("", "_blank");
    const release = holdSessionForExternalFlow();
    try {
      const r = await cbBuy({ data: { wallet: address!, asset: "SOL", origin: window.location.origin } });
      if (!r.success) { tab?.close(); throw new Error(r.error); }
      if (tab) tab.location.href = r.url; else window.location.href = r.url;
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); release(); }
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const q = useQuery({ queryKey: ["start-guide", address], enabled: !!address && session.authenticated, staleTime: 10_000, refetchInterval: 15_000, queryFn: async () => {
    const r = await read({ data: { wallet: address! } });
    if (!r.success) throw new Error(r.error);
    return { sol: decimalToUnits(r.data.sol, 9) ?? 0n, usdc: decimalToUnits(r.data.usdc, 6) ?? 0n };
  } });
  const convertible = q.data ? autoConvertLamports(q.data.sol) : 0n;
  const preview = useQuery({ queryKey: ["auto-fund-quote", convertible.toString()], enabled: convertible > 0n && !!q.data && !busy && !receipt, staleTime: 20_000, refetchInterval: 30_000, retry: false, queryFn: () => quoteSwap("SOL", "USDC", convertible) });

  const box = `rounded-2xl border border-primary/40 bg-primary/10 p-5 ${className ?? ""}`;
  if (receipt) return <section aria-label={t("Comprobante")} className={box} role="status">
    <CheckCircle2 className="size-9 text-primary" aria-hidden="true" />
    <h2 className="mt-2 font-display text-xl font-semibold">{t("¡Tus dólares están listos!")}</h2>
    <p className="mt-1 text-sm text-foreground/85">{t("Ya puedes depositar en una bóveda o entrar a Sube/Baja.")}</p>
    <dl className="mt-4 divide-y divide-border rounded-xl border border-border bg-card text-sm">
      {[
        [t("Convertido"), `${num(receipt.solIn, 9, 4)} SOL`],
        [t("Recibes (aprox.)"), `${num(receipt.usdcOut, 6, 2)} USDC`],
        ...(receipt.minimum !== null ? [[t("Mínimo garantizado"), `${num(receipt.minimum, 6, 2)} USDC`]] : []),
        [t("Comisión BÓVEDA"), "0.00 USDC"],
        [t("Reservado para costos de red"), `${num(receipt.kept, 9, 4)} SOL`],
        [t("Comprobante"), `${receipt.signature.slice(0, 6)}…${receipt.signature.slice(-6)}`],
      ].map(([k, v]) => <div key={k} className="flex justify-between gap-3 px-4 py-2.5"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
    </dl>
    <p className="mt-2 text-xs text-muted-foreground">{t("Tu saldo se actualizará en unos segundos.")}</p>
    <Button className="mt-4 w-full" onClick={() => setReceipt(null)}>{t("Listo")}</Button>
  </section>;

  if (!q.data || !address) return null;
  const step = onboardingStep(q.data.sol, q.data.usdc);
  if (!step && convertible <= 0n) return null;

  if (step === "sol") return <section aria-label={t("Añadir fondos")} className={box}>
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Sparkles size={14} />{t("Empieza aquí")}</p>
    <h2 className="mt-2 font-display text-xl font-semibold">{t("Añade fondos con Coinbase")}</h2>
    <p className="mt-1 text-sm leading-6 text-foreground/85">{t("Paga con tu saldo de Coinbase, banco o tarjeta y el dinero llega solo a tu cuenta. Luego lo activamos en dólares con un toque.")}</p>
    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck size={14} className="text-primary" />{t("Solo tú controlas tus fondos. BÓVEDA no puede moverlos sin tu firma.")}</p>
    <Button className="mt-4 w-full" onClick={() => void buyStarter()}><CreditCard size={16} />{t("Añadir fondos con Coinbase")}</Button>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </section>;

  const quote: SwapQuote | undefined = preview.data;
  const usd = quote ? Number(quote.outAmount) / 1e6 : 0;
  if (convertible <= 0n || (quote && usd < SOL_EXCESS_MIN_USD)) return null;
  async function activate() {
    if (!address) return;
    setBusy(true); setError(null);
    try {
      const fresh = await quoteSwap("SOL", "USDC", convertible);
      const signature = await session.signAndSend(await buildSwap(address, fresh));
      setReceipt({ solIn: convertible, usdcOut: BigInt(fresh.outAmount), minimum: fresh.minimum ? BigInt(fresh.minimum) : null, kept: q.data!.sol - convertible, signature });
      void queryClient.invalidateQueries();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }
  return <section aria-label={t("Activa tus dólares")} className={box}>
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><CheckCircle2 size={14} />{t("Fondos recibidos")}</p>
    <h2 className="mt-2 font-display text-xl font-semibold">{t("Activa tus dólares")}</h2>
    <p className="mt-1 text-sm leading-6 text-foreground/85">{quote ? t("Convertimos tu saldo a ~${usd} USDC sin comisión y guardamos un poco para costos de red.", { usd: usd.toFixed(2) }) : t("Calculando tu saldo en dólares…")}</p>
    <Button className="mt-4 w-full" disabled={busy || !quote} onClick={() => void activate()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{busy ? t("Activando…") : t("Activar mis dólares")}</Button>
    <p className="mt-2 text-xs text-muted-foreground">{t("Reservamos {sol} SOL para costos de red. Confirmarás con tu firma.", { sol: num(GAS_KEEP_LAMPORTS, 9, 3) })}</p>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </section>;
}
