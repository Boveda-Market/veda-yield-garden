import { TokenIcon } from "@/components/token-icon";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, KeyRound, Send, ArrowLeftRight, RefreshCw, CreditCard, QrCode, CheckCircle2, ShieldAlert, ChevronDown, ChevronRight, LayoutDashboard, PieChart, Plus, TrendingUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Banknote } from "lucide-react";
import { OfframpButton } from "@/components/offramp-dialog";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { getRealWallet } from "@/lib/solana.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildSwap, buildTransfer, readTokenBalance, spendable, STABLE_SYMBOLS, SWAP_TOKENS, toBaseUnits, type SwapQuote, type WalletAsset } from "@/lib/wallet-actions";
import { WalletSwap } from "@/components/wallet-swap";
import { solanaAddressSchema } from "@/lib/solana-data";
import { decimalToUnits } from "@/lib/onboarding";
import { StartGuide } from "@/components/start-guide";

import { BuyUsdc } from "@/components/buy-usdc";
import { InstallAppBanner } from "@/components/install-app";
import { PendingClaims } from "@/components/pending-claims";
import { WalletPositions } from "@/components/wallet-positions";
import { WalletOpenPredictions } from "@/components/open-predictions";


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
    Object.fromEntries(await Promise.all(extraTokens.map(async (x) => [x.symbol, await readTokenBalance(address!, x.mint).catch(() => undefined)] as const))) as Record<string, bigint | undefined> });
  const swapBalances: Record<string, bigint | undefined> = { SOL: balances.data?.sol, USDC: balances.data?.usdc, ...(extra.data ?? {}) };
  const [swapFrom, setSwapFrom] = useState({ key: 0, from: "USDC", amount: "" });
  const [tab, setTab] = useState<"send" | "swap">("swap");
  const [asset, setAsset] = useState<WalletAsset>("USDC");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [buyOpen, setBuyOpen] = useState(0);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const actionsRef = useRef<HTMLElement>(null);
  const prices = useQuery({ queryKey: ["wallet-prices"], staleTime: 60_000, queryFn: async () => {
    const out: Record<string, number> = Object.fromEntries(STABLE_SYMBOLS.map((s) => [s, 1]));
    await Promise.all(SWAP_TOKENS.filter((x) => !STABLE_SYMBOLS.includes(x.symbol)).map(async (x) => {
      try { const r = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${x.mint}`); const j = await r.json() as { priceUsd?: string; liquidity?: { usd?: number } }[];
        const best = Array.isArray(j) ? [...j].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] : undefined;
        const p = Number(best?.priceUsd); if (Number.isFinite(p) && p > 0) out[x.symbol] = p; } catch { /* price unavailable */ }
    }));
    return out;
  } });
  useEffect(() => { const f = new URLSearchParams(window.location.search).get("swap"); if (f === "SOL" || f === "USDC") { setTab("swap"); setSwapFrom((v) => ({ key: v.key + 1, from: f, amount: "" })); window.history.replaceState(null, "", "/wallet"); setTimeout(() => actionsRef.current?.scrollIntoView({ behavior: "smooth" }), 300); } }, []);
  useEffect(() => { const c = new URLSearchParams(window.location.search).get("convert"); if (c && /^\d+(\.\d+)?$/.test(c)) { setTab("swap"); setSwapFrom((v) => ({ key: v.key + 1, from: "SOL", amount: c })); window.history.replaceState(null, "", "/wallet"); setTimeout(() => actionsRef.current?.scrollIntoView({ behavior: "smooth" }), 300); } }, []);
  useEffect(() => { if (!receiveOpen || !address || qr) return; void import("qrcode").then((m) => m.toDataURL(address, { width: 448, margin: 1 })).then(setQr).catch(() => setQr(null)); }, [receiveOpen, address, qr]);

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
    try {
      let bytes: Uint8Array;
      try { bytes = await buildSwap(address, quote); } catch (e) {
        console.error("[BÓVEDA] swap preparation failed", e);
        throw new Error(`${t("No se pudo preparar el cambio")}: ${e instanceof Error ? e.message : String(e)}`);
      }
      done(await session.signAndSend(bytes)); setMessage(null);
    } catch (e) { fail(e); throw e; } finally { setBusy(false); }
  }

  const fmt = (v: number, d = 2) => v.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: d });
  const assets = [
    { symbol: "USDC", label: t("Dólar digital"), raw: balances.data?.usdc, decimals: 6 },
    { symbol: "SOL", label: t("Para costos de red"), raw: balances.data?.sol, decimals: 9 },
    ...extraTokens.map((x) => ({ symbol: x.symbol, label: x.symbol === "JupUSD" ? t("Pagos de predicciones") : x.symbol, raw: extra.data?.[x.symbol], decimals: x.decimals })),
  ].filter((a) => a.symbol === "USDC" || a.symbol === "SOL" || a.symbol === "MET" || (a.raw !== undefined && a.raw > 0n)).map((a) => { const amt = a.raw === undefined ? undefined : Number(a.raw) / 10 ** a.decimals; const p = prices.data?.[a.symbol]; return { ...a, amt, usd: amt !== undefined && p !== undefined ? amt * p : undefined }; });
  const openSwap = (from: string, amount = "") => { setTab("swap"); setSwapFrom((v) => ({ key: v.key + 1, from, amount })); actionsRef.current?.scrollIntoView({ behavior: "smooth" }); };
  const openSend = (a: WalletAsset) => { setTab("send"); setAsset(a); actionsRef.current?.scrollIntoView({ behavior: "smooth" }); };
  const decimals = asset === "SOL" ? 9 : 6;
  const setPct = (pct: bigint) => setAmount((Number((max * pct) / 100n) / 10 ** decimals).toString());
  const quick = [
    { icon: CreditCard, label: t("Añadir fondos"), on: () => setBuyOpen((v) => v + 1) },
    { icon: ArrowLeftRight, label: t("Cambiar"), on: () => openSwap("USDC") },
    { icon: Send, label: t("Enviar"), on: () => openSend("USDC") },
    { icon: QrCode, label: t("Recibir"), on: () => setReceiveOpen(true) },
  ];
  const shortcuts = [
    { to: "/app", icon: LayoutDashboard, title: t("Bóvedas"), sub: t("Genera rendimiento diario") },
    { to: "/mercados", icon: TrendingUp, title: t("Sube/Baja"), sub: t("Predicciones BTC, ETH, SOL") },
    { to: "/portfolio", icon: PieChart, title: t("Portafolio"), sub: t("Tus ganancias y estadísticas") },
  ] as const;

  return <div className="mx-auto max-w-2xl space-y-5">
    <h1 className="font-display text-3xl font-semibold">{t("Mi wallet")}</h1>
    <InstallAppBanner />
    <PendingClaims />

    <StartGuide />
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{t("Balance en USDC")}</p><Button variant="ghost" size="sm" onClick={() => { void balances.refetch(); void extra.refetch(); void prices.refetch(); void queryClient.invalidateQueries({ queryKey: ["real-solana", address] }); void queryClient.invalidateQueries({ queryKey: ["predict-positions", address] }); }} aria-label={t("Actualizar")}><RefreshCw size={16} /></Button></div>
      <p className="mt-1 font-display text-4xl">{balances.data?.usdc !== undefined ? `$${fmt(Number(balances.data.usdc) / 1e6)}` : "—"}</p>
      <button type="button" onClick={() => setReceiveOpen(true)} className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:text-foreground"><code>{address.slice(0, 4)}…{address.slice(-4)}</code><Copy size={12} /></button>
      <div className="mt-5 grid grid-cols-5 gap-1 sm:gap-2">{quick.slice(0, 1).concat([]).map((q) => <button key={q.label} type="button" onClick={q.on} className="flex flex-col items-center gap-1.5 text-center text-xs"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"><q.icon size={20} /></span>{q.label}</button>)}<OfframpButton wallet={address} trial={false} trigger={(open) => <button type="button" onClick={open} className="flex flex-col items-center gap-1.5 text-center text-xs"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"><Banknote size={20} /></span>{t("Retirar")}</button>} />{quick.slice(1).map((q) => <button key={q.label} type="button" onClick={q.on} className="flex flex-col items-center gap-1.5 text-center text-xs"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"><q.icon size={20} /></span>{q.label}</button>)}</div>
      {buyOpen ? <BuyUsdc className="mt-5" auto={buyOpen} /> : null}
      {balances.error && <p className="mt-2 text-sm text-destructive">{(balances.error as Error).message}</p>}
    </section>

    <section aria-label={t("Accesos rápidos")} className="grid gap-2 sm:grid-cols-3 sm:gap-3">
      {shortcuts.map((s) => <Link key={s.to} to={s.to} className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/5 sm:flex-col sm:items-start">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><s.icon size={20} aria-hidden /></span>
        <span className="min-w-0 flex-1"><span className="block font-display text-base font-semibold">{s.title}</span><span className="block text-xs text-muted-foreground">{s.sub}</span></span>
        <ChevronRight size={16} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:hidden" aria-hidden />
      </Link>)}
    </section>

    <WalletPositions wallet={address} />
    <WalletOpenPredictions />

    <section className="rounded-2xl border border-border bg-card p-2">
      <h3 className="px-3 pt-3 pb-1 font-display text-lg">{t("Tus activos")}</h3>
      <ul>{assets.map((a) => <li key={a.symbol} className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted">
        <TokenIcon symbol={a.symbol} size={40} />
        <div className="min-w-0 flex-1"><p className="font-medium">{a.symbol}</p><p className="text-xs text-muted-foreground">{a.label}</p></div>
        <div className="text-right"><p className="font-medium">{a.amt !== undefined ? fmt(a.amt, a.symbol === "USDC" ? 2 : 4) : "—"}</p><p className="text-xs text-muted-foreground">{a.usd !== undefined ? `$${fmt(a.usd)}` : "—"}</p></div>
        {a.symbol === "USDC" && <Button size="icon" variant="ghost" aria-label={t("Añadir fondos")} onClick={() => setBuyOpen((v) => v + 1)}><Plus size={16} /></Button>}
        <Button size="icon" variant="ghost" aria-label={t("Cambiar")} onClick={() => openSwap(a.symbol)}><ArrowLeftRight size={16} /></Button>
        {(a.symbol === "USDC" || a.symbol === "SOL") && <Button size="icon" variant="ghost" aria-label={t("Enviar")} onClick={() => openSend(a.symbol as WalletAsset)}><Send size={16} /></Button>}
      </li>)}</ul>
    </section>

    <section ref={actionsRef} className="scroll-mt-20 rounded-2xl border border-border bg-card p-5">
      <div className="flex gap-2"><Button disabled={busy} variant={tab === "swap" ? "secondary" : "ghost"} onClick={() => setTab("swap")}><ArrowLeftRight size={16} />{t("Cambiar")}</Button><Button disabled={busy} variant={tab === "send" ? "secondary" : "ghost"} onClick={() => setTab("send")}><Send size={16} />{t("Enviar")}</Button></div>
      {tab === "swap" ? <WalletSwap key={swapFrom.key} balances={swapBalances} initialFrom={swapFrom.from} initialAmount={swapFrom.amount} busy={busy} onConfirm={swap} /> : <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">{(["USDC", "SOL"] as const).map((a) => { const b = a === "SOL" ? balances.data?.sol : balances.data?.usdc; return <button key={a} type="button" onClick={() => setAsset(a)} className={`rounded-xl border p-3 text-left ${asset === a ? "border-primary bg-primary/10" : "border-border"}`}><p className="flex items-center gap-2 font-medium"><TokenIcon symbol={a} size={20} />{a}</p><p className="text-xs text-muted-foreground">{t("Disponible")}: {b !== undefined ? fmt(Number(spendable(b, a)) / 10 ** (a === "SOL" ? 9 : 6), 4) : "—"}</p></button>; })}</div>
        <div><label className="text-xs text-muted-foreground">{t("Dirección de destino")}</label><Input className="mt-1" placeholder={t("Pega la dirección aquí")} value={to} onChange={(e) => setTo(e.target.value.trim())} />
          {toError ? <p className="mt-1 text-sm text-destructive">{toError}</p> : to && <p className="mt-1 flex items-center gap-1 text-xs text-primary"><CheckCircle2 size={12} />{t("Dirección válida")}: {to.slice(0, 4)}…{to.slice(-4)}</p>}
          {to && to === address && <p className="mt-1 text-xs text-destructive">{t("Esta es tu propia dirección.")}</p>}</div>
        <div><label className="text-xs text-muted-foreground">{t("Monto")}</label><Input className="mt-1" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} />
          <div className="mt-2 grid grid-cols-4 gap-2">{([25n, 50n, 75n, 100n] as const).map((p) => <Button key={String(p)} size="sm" variant="outline" onClick={() => setPct(p)}>{p === 100n ? t("Máx") : `${p}%`}</Button>)}</div>
          {amountError && <p className="mt-1 text-sm text-destructive">{amountError}</p>}{asset === "SOL" && <p className="mt-1 text-xs text-muted-foreground">{t("Guardamos 0.01 SOL para pagar los costos de red.")}</p>}</div>
        {units && !amountError && to && !toError && <div className="rounded-xl bg-muted p-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">{t("Envías")}</span><span>{amount} {asset}</span></div><div className="flex justify-between"><span className="text-muted-foreground">{t("Comisión BÓVEDA")}</span><span>0</span></div><div className="flex justify-between"><span className="text-muted-foreground">{t("Destino")}</span><code>{to.slice(0, 4)}…{to.slice(-4)}</code></div></div>}
        <p className="text-xs text-muted-foreground">{t("Revisa bien la dirección: los envíos no se pueden revertir. BÓVEDA no cobra comisión por enviar.")}</p>
        <Button className="w-full" disabled={busy || !units || !!amountError || !to || !!toError} onClick={() => void send()}>{busy ? t("Procesando…") : t("Revisar y firmar envío")}</Button>
      </div>}
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    </section>

    <details className="group rounded-2xl border border-border bg-card p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between font-display text-lg"><span className="flex items-center gap-2"><ShieldAlert size={18} />{t("Avanzado")}</span><ChevronDown size={18} className="transition-transform group-open:rotate-180" /></summary>
      <h4 className="mt-4 flex items-center gap-2 font-medium"><KeyRound size={16} />{t("Tu llave privada")}</h4>
      {session.exportWallet ? <>
        <p className="mt-2 text-sm text-muted-foreground">{t("Puedes ver y copiar tu llave privada para usar esta wallet en otra app. Quien tenga esta llave controla tus fondos: nunca la compartas.")}</p>
        <Button className="mt-3" variant="outline" onClick={() => void session.exportWallet?.().catch(fail)}>{t("Ver mi llave privada")}</Button>
      </> : <p className="mt-2 text-sm text-muted-foreground">{t("Tu wallet externa (Phantom o Jupiter) guarda tu llave. Puedes verla desde esa app.")}</p>}
    </details>

    <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t("Recibir fondos")}</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-card p-3 ring-1 ring-border">{qr ? <img src={qr} alt={t("Código QR de tu dirección")} className="h-56 w-56" /> : <div className="h-56 w-56 animate-pulse rounded-xl bg-muted" />}</div>
          <code className="w-full break-all rounded-lg bg-muted p-3 text-center text-xs">{address}</code>
          <Button className="w-full" onClick={() => { void navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={14} />{copied ? t("Copiado") : t("Copiar dirección")}</Button>
          <p className="text-center text-xs text-muted-foreground">{t("Envía solo USDC, SOL o monedas compatibles a esta dirección.")}</p>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
