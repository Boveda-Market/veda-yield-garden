import { useEffect, useState, type ReactNode } from "react";
import { Banknote, CheckCircle2, ClipboardPaste, LoaderCircle, Send, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { useT } from "@/lib/i18n";
import { solanaAddressSchema } from "@/lib/solana-data";
import { USDC_MINT, buildTransfer, readTokenBalance, toBaseUnits } from "@/lib/wallet-actions";
import { withdrawFee } from "@/lib/fees";
import { CashAppBtc } from "@/components/cashapp-btc";
import { CoinbaseSell } from "@/components/coinbase-sell";

type Provider = "bank" | "cashapp";

/** Withdraw-to-bank guide: send USDC to the user's own exchange, then cash out there. BÓVEDA charges nothing. */
export function OfframpButton({ wallet, trial, trigger }: { wallet: string | null; trial: boolean; trigger?: (open: () => void) => ReactNode }) {
  const t = useT();
  const { signAndSend } = useBovedaSession();
  const reportAffiliate = useAffiliateReport();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("bank");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [balance, setBalance] = useState<bigint | null>(null);
  useEffect(() => { if (!open || !wallet || trial) return; readTokenBalance(wallet, USDC_MINT).then(setBalance).catch(() => setBalance(null)); }, [open, wallet, trial, sig]);
  const pick = (f: number) => { if (balance == null) return; const v = (balance * BigInt(Math.round(f * 100))) / 100n; setAmount((Math.floor(Number(v) / 1e4) / 100).toFixed(2)); };
  async function paste() { try { setTo((await navigator.clipboard.readText()).trim()); } catch { /* clipboard blocked */ } }
  const wrongNetwork = /^0x/i.test(to) ? "evm" : /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,}$/.test(to) && !solanaAddressSchema.safeParse(to).success ? "btc" : null;
  const units = toBaseUnits(amount, "USDC");
  const fee = units ? withdrawFee(units) : 0n;
  const net = units ? units - fee : 0n;
  const addressOk = solanaAddressSchema.safeParse(to.trim()).success && to.trim() !== wallet;
  const overBalance = balance != null && !!units && units > balance;
  const canSend = !trial && !!wallet && addressOk && !!units && net > 0n && !overBalance && checked && !busy;

  async function send() {
    if (!canSend || !wallet || !units) return;
    setBusy(true); setError(null);
    try { const s = await signAndSend(await buildTransfer({ from: wallet, to: to.trim(), asset: "USDC", amount: net, fee })); setSig(s); if (fee > 0n) void reportAffiliate(s, "withdraw"); }
    catch (e) { setError(e instanceof Error ? e.message : t("No se pudo completar la operación.")); }
    finally { setBusy(false); }
  }

  const options: Record<Provider, { icon: string; label: string; perk: string }> = {
    bank: { icon: "/brands/coinbase.svg", label: t("Banco o tarjeta"), perk: t("Llega en segundos · vía Coinbase o tu exchange") },
    cashapp: { icon: "/brands/cashapp.svg", label: "Cash App", perk: t("Automático a Bitcoin · 15 a 30 min") },
  };
  const bankSteps = [
    t("En Coinbase (o tu exchange) toca «Recibir» y elige USDC."),
    t("Elige la red Solana. Es muy importante."),
    t("Copia la dirección y pégala aquí."),
  ];

  return <>
    {trigger ? trigger(() => setOpen(true)) : <Button size="sm" onClick={() => setOpen(true)}><Banknote size={16} />{t("Retirar a banco o tarjeta")}</Button>}
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}><DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{t("Retirar a banco o tarjeta")}</DialogTitle><DialogDescription>{t("Envía tus USDC a tu cuenta de exchange y desde allí pásalos a tu banco o tarjeta. BÓVEDA cobra una comisión fija del 1%.")}</DialogDescription></DialogHeader>
      <div className="grid grid-cols-2 gap-2">{(Object.keys(options) as Provider[]).map((p) => <button key={p} type="button" onClick={() => setProvider(p)} aria-pressed={provider === p} className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${provider === p ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border hover:border-primary/50"}`}><img src={options[p].icon} alt="" width={28} height={28} className="h-7 w-7 rounded-md" /><span className="text-sm font-semibold">{options[p].label}</span><span className="text-xs text-muted-foreground">{options[p].perk}</span></button>)}</div>
      {provider === "bank" && <ol className="space-y-2">{bankSteps.map((s, i) => <li key={s} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span><span className="pt-0.5">{s}</span></li>)}</ol>}
      {provider === "bank" && <p className="text-xs text-muted-foreground">{t("¿Usas PayPal? Retira primero a Coinbase y desde allí pásalo a PayPal.")}</p>}
      {provider === "cashapp" && <p className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs"><TriangleAlert size={14} className="mt-0.5 shrink-0 text-destructive" />{t("Cash App solo recibe Bitcoin. Aquí convertimos tus USDC automáticamente; nunca envíes USDC directo a Cash App.")}</p>}
      {trial ? <p role="status" className="text-sm">{t("En Prueba los créditos son ficticios y no se pueden retirar. Cambia a Real para usar esta opción.")}</p>
        : !wallet ? <p role="status" className="text-sm">{t("Conecta tu wallet para retirar.")}</p>
        : provider === "cashapp" ? <CashAppBtc wallet={wallet} />
        : sig ? <div role="status" className="grid gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={16} />{t("¡Enviado! Tus USDC ya están en camino a tu exchange.")}</p><a className="text-xs underline" href={`https://orbmarkets.io/tx/${sig}`} target="_blank" rel="noopener noreferrer">{t("Ver comprobante")}</a><Button size="sm" variant="outline" onClick={() => { setSig(null); setAmount(""); setChecked(false); }}>{t("Hacer otro retiro")}</Button></div>
        : <div className="grid gap-3">
          <CoinbaseSell wallet={wallet} />
          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("O envía manualmente a tu exchange")}</p>
          <label className="grid gap-1 text-sm"><span className="font-medium">{t("Dirección USDC de tu exchange (red Solana)")}</span><div className="flex gap-2"><Input value={to} onChange={(e) => setTo(e.target.value.trim())} placeholder="Ej. 7xKX…" disabled={busy} autoComplete="off" spellCheck={false} /><Button type="button" variant="outline" size="sm" className="h-10" onClick={() => void paste()} disabled={busy}><ClipboardPaste size={16} />{t("Pegar")}</Button></div></label>
          {wrongNetwork && <p role="alert" className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs"><TriangleAlert size={14} className="mt-0.5 shrink-0 text-destructive" />{wrongNetwork === "evm" ? t("Esta dirección es de otra red (Ethereum/Base/Polygon). En tu exchange elige la red Solana o perderás el dinero.") : t("Esta es una dirección de Bitcoin. Para enviar a Bitcoin usa la opción Cash App.")}</p>}
          {to && !addressOk && !wrongNetwork && <p className="text-xs text-destructive">{t("Dirección no válida")}</p>}
          <label className="grid gap-1 text-sm"><span className="font-medium">{t("Monto en USDC")}</span><Input value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} inputMode="decimal" placeholder="0.00" disabled={busy} /></label>
          <div className="text-xs text-muted-foreground">{t("Disponible")}: {balance == null ? "…" : `${(Number(balance) / 1e6).toFixed(2)} USDC`}</div>
          <div className="grid grid-cols-4 gap-2">{([[0.25, "25%"], [0.5, "50%"], [0.75, "75%"], [1, t("Máx")]] as const).map(([f, l]) => <Button key={l} type="button" size="sm" variant="outline" disabled={busy || !balance} onClick={() => pick(f)}>{l}</Button>)}</div>
          {overBalance && <p className="text-xs text-destructive">{t("Saldo insuficiente")}</p>}
          {units ? <div className="grid gap-1 rounded-lg border p-3 text-xs"><div className="flex justify-between"><span>{t("Monto a retirar")}</span><span>{(Number(units) / 1e6).toFixed(2)} USDC</span></div><div className="flex justify-between"><span>{t("Comisión de BÓVEDA (1%)")}</span><span>-{(Number(fee) / 1e6).toFixed(2)} USDC</span></div><div className="flex justify-between"><span>{t("Costo de red")}</span><span>{"< $0.01"}</span></div><div className="flex justify-between text-sm"><span>{t("Llega a tu exchange")}</span><b>{(Number(net) / 1e6).toFixed(2)} USDC</b></div><div className="flex justify-between"><span>{t("Tiempo estimado")}</span><span>{t("unos segundos")}</span></div></div> : null}
          <label className="flex items-start gap-2 text-xs leading-5"><Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} disabled={busy} /><span>{t("Revisé la dirección. Si es incorrecta, el dinero no se puede recuperar.")}</span></label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button disabled={!canSend} onClick={() => void send()}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{busy ? t("Firma en tu wallet…") : t("Enviar USDC")}</Button>
          <p className="text-xs text-muted-foreground">{t("Además de la comisión del 1%, pagas un costo de red de menos de un centavo. Tu exchange te mostrará sus propias condiciones para retirar al banco.")}</p>
        </div>}
    </DialogContent></Dialog>
  </>;
}
