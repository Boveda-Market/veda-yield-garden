import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, KeyRound, Send, ArrowLeftRight, RefreshCw } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { getRealWallet } from "@/lib/solana.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildSwap, buildTransfer, readTokenBalance, spendable, SWAP_TOKENS, toBaseUnits, type SwapQuote, type WalletAsset } from "@/lib/wallet-actions";
import { WalletSwap } from "@/components/wallet-swap";
import { solanaAddressSchema } from "@/lib/solana-data";
import { decimalToUnits } from "@/lib/onboarding";
import { StartGuide } from "@/components/start-guide";
import { BuyUsdc } from "@/components/buy-usdc";

const fmtUnits = (v: bigint | string, d: number, shown = 4) => (Number(v) / 10 ** d).toLocaleString(undefined, { maximumFractionDigits: shown });

export function WalletPanel() {
  const t = useT();
  const session = useBovedaSession();
  const address = session.walletAddress;
  const readWallet = useServerFn(getRealWallet);
  const queryClient = useQueryClient();
  const balances = useQuery({ queryKey: ["my-wallet", address], enabled: !!address, queryFn: async () => {
    if (!address) throw new Error(t("Todavía no hay una wallet conectada a tu cuenta."));
    const r = await readWallet({ data: { wallet: address } });
    if (!r.success) throw new Error(r.error);
    return { sol: decimalToUnits(r.data.sol, 9) ?? 0n, usdc: decimalToUnits(r.data.usdc, 6) ?? 0n };
  } });
  const extraTokens = SWAP_TOKENS.filter((x) => x.symbol !== "SOL" && x.symbol !== "USDC");
  const extra = useQuery({ queryKey: ["my-wallet-tokens", address], enabled: !!address && extraTokens.length > 0, queryFn: async () =>
    Object.fromEntries(await Promise.all(extraTokens.map(async (x) => [x.symbol, await readTokenBalance(address!, x.mint)] as const))) as Record<string, bigint> });
  const swapBalances: Record<string, bigint | undefined> = { SOL: balances.data?.sol, USDC: balances.data?.usdc, ...(extra.data ?? {}) };
  const [swapFrom, setSwapFrom] = useState({ key: 0, from: "USDC" });
  const [tab, setTab] = useState<"send" | "swap">("send");
  const [asset, setAsset] = useState<WalletAsset>("USDC");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!session.authenticated) return <p className="text-muted-foreground">{t("Inicia sesión para ver tu wallet.")}</p>;
  if (!address) return <p className="text-muted-foreground">{t("Todavía no hay una wallet conectada a tu cuenta.")}</p>;

  const balance = asset === "SOL" ? balances.data?.sol : balances.data?.usdc;
  const units = toBaseUnits(amount, asset);
  const max = balance === undefined ? 0n : spendable(balance, asset);
  const amountError = amount && (!units ? t("Monto no válido") : units > max ? t("Saldo insuficiente") : null);
  const toError = tab === "send" && to && !solanaAddressSchema.safeParse(to).success ? t("Dirección no válida") : null;
  const reset = () => { setAmount(""); setTo(""); };
  const done = (sig: string) => { setMessage(t("Listo. Operación enviada: {sig}", { sig: `${sig.slice(0, 8)}…` })); reset(); setTimeout(() => { void queryClient.invalidateQueries({ queryKey: ["my-wallet", address] }); void queryClient.invalidateQueries({ queryKey: ["my-wallet-tokens", address] }); }, 4000); };
  const fail = (e: unknown) => setMessage(e instanceof Error ? e.message : t("No se pudo completar la operación."));

  async function send() {
    if (!units || amountError || toError || !to) return;
    setBusy(true); setMessage(null);
    if (!address) return;
    try { done(await session.signAndSend(await buildTransfer({ from: address, to, asset, amount: units }))); } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function swap(quote: SwapQuote) {
    if (!address) return;
    setBusy(true); setMessage(null);
    try { done(await session.signAndSend(await buildSwap(address, quote))); setMessage(null); } catch (e) { fail(e); throw e; } finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-2xl space-y-5">
    <StartGuide onSwap={() => { setTab("swap"); setSwapFrom((v) => ({ key: v.key + 1, from: "SOL" })); }} />
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between"><h2 className="font-display text-2xl">{t("Mi wallet")}</h2><Button variant="ghost" size="sm" onClick={() => void balances.refetch()} aria-label={t("Actualizar")}><RefreshCw size={16} /></Button></div>
      <p className="mt-1 text-sm text-muted-foreground">{t("Tu dirección para recibir fondos")}</p>
      <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 text-sm">{address}</code><Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={14} />{copied ? t("Copiado") : t("Copiar")}</Button></div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">USDC</p><p className="font-display text-xl">{balances.data ? fmtUnits(balances.data.usdc, 6, 2) : "—"}</p></div>
        <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">{t("SOL · para costos de red")}</p><p className="font-display text-xl">{balances.data ? fmtUnits(balances.data.sol, 9) : "—"}</p></div>
        {extraTokens.map((x) => <div key={x.symbol} className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">{x.symbol}</p><p className="font-display text-xl">{extra.data?.[x.symbol] !== undefined ? fmtUnits(extra.data[x.symbol]!, x.decimals) : "—"}</p></div>)}
      </div>
      <BuyUsdc className="mt-4" />
      {balances.error && <p className="mt-2 text-sm text-destructive">{(balances.error as Error).message}</p>}
    </section>

    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex gap-2"><Button disabled={busy} variant={tab === "send" ? "secondary" : "ghost"} onClick={() => setTab("send")}><Send size={16} />{t("Enviar")}</Button><Button disabled={busy} variant={tab === "swap" ? "secondary" : "ghost"} onClick={() => setTab("swap")}><ArrowLeftRight size={16} />{t("Cambiar")}</Button></div>
      {tab === "swap" ? <WalletSwap key={swapFrom.key} balances={swapBalances} initialFrom={swapFrom.from} busy={busy} onConfirm={swap} /> : <div className="mt-4 space-y-3">
        <div className="flex gap-2">{(["USDC", "SOL"] as const).map((a) => <Button key={a} size="sm" variant={asset === a ? "default" : "outline"} onClick={() => setAsset(a)}>{a}</Button>)}</div>
        {tab === "send" && <div><Input placeholder={t("Dirección de destino")} value={to} onChange={(e) => setTo(e.target.value.trim())} />{toError && <p className="mt-1 text-sm text-destructive">{toError}</p>}</div>}
        <div><div className="flex gap-2"><Input inputMode="decimal" placeholder={t("Monto")} value={amount} onChange={(e) => setAmount(e.target.value)} /><Button variant="outline" size="sm" className="h-10" onClick={() => setAmount((Number(max) / 10 ** (asset === "SOL" ? 9 : 6)).toString())}>{t("Máx")}</Button></div>{amountError && <p className="mt-1 text-sm text-destructive">{amountError}</p>}{asset === "SOL" && <p className="mt-1 text-xs text-muted-foreground">{t("Guardamos 0.01 SOL para pagar los costos de red.")}</p>}</div>
        <>
          <p className="text-xs text-muted-foreground">{t("Revisa bien la dirección: los envíos no se pueden revertir. BÓVEDA no cobra comisión por enviar.")}</p>
          <Button className="w-full" disabled={busy || !units || !!amountError || !to || !!toError} onClick={() => void send()}>{busy ? t("Procesando…") : t("Revisar y firmar envío")}</Button>
        </>
      </div>}
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    </section>

    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 font-display text-lg"><KeyRound size={18} />{t("Tu llave privada")}</h3>
      {session.exportWallet ? <>
        <p className="mt-2 text-sm text-muted-foreground">{t("Puedes ver y copiar tu llave privada para usar esta wallet en otra app. Quien tenga esta llave controla tus fondos: nunca la compartas.")}</p>
        <Button className="mt-3" variant="outline" onClick={() => void session.exportWallet?.().catch(fail)}>{t("Ver mi llave privada")}</Button>
      </> : <p className="mt-2 text-sm text-muted-foreground">{t("Tu wallet externa (Phantom o Jupiter) guarda tu llave. Puedes verla desde esa app.")}</p>}
    </section>
  </div>;
}
