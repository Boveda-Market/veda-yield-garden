import { useState } from "react";
import { Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VAULTS } from "@/lib/vaults";
import { isDlmmVault } from "@/lib/solana-data";
import { Dialog, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { GITHUB_REPO_URL, GithubMark } from "@/components/github-link";

/** Vaults a curious visitor can audit on the public pool provider (home only; in-app Meteora URLs stay copy-only). */
const IDS = ["btc", "trump", "dcty"] as const;
export const VERIFY_POOLS = IDS.map((id) => VAULTS.find((v) => v.id === id)!).filter(Boolean).map((v) => ({
  id: v.id, name: v.name, pair: v.pair, pool: v.pool,
  meteora: `https://app.meteora.ag/${isDlmmVault(v.id) ? "dlmm" : "dammv2"}/${v.pool}`,
  solscan: `https://solscan.io/account/${v.pool}`,
}));

function PoolCard({ p }: { p: (typeof VERIFY_POOLS)[number] }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(p.pool); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked clipboard */ } };
  return <li className="min-w-0 rounded-2xl border border-border bg-card p-4">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="whitespace-nowrap font-display text-base font-semibold">{t(p.name)}</p>
      <span className="whitespace-nowrap rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{p.pair}</span>
      <span className="ml-auto flex shrink-0 items-center gap-2 text-xs font-semibold">
        <a href={p.meteora} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-xl border border-primary/40 px-3 text-primary transition-colors hover:bg-primary/10">{t("Ver en Meteora")}<ExternalLink size={12} aria-hidden /></a>
        <a href={p.solscan} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-xl border border-border px-3 text-foreground transition-colors hover:bg-secondary">{t("Ver en Solscan")}<ExternalLink size={12} aria-hidden /></a>
      </span>
    </div>
    <button type="button" onClick={copy} title={p.pool} className="mt-3 flex w-full items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-left font-mono text-[11px] text-foreground/80" aria-label={t("Copiar dirección del pool")}>
      <span className="min-w-0 flex-1 break-all leading-5">{p.pool}</span>
      <span className="flex shrink-0 items-center gap-1 font-sans text-[11px] font-semibold text-muted-foreground">{copied ? <><Check size={13} className="text-primary" aria-hidden />{t("Copiada")}</> : <><Copy size={13} aria-hidden />{t("Copiar")}</>}</span>
    </button>
  </li>;
}

export function VerifyPoolList() {
  return <ul className="grid min-w-0 grid-cols-1 gap-3">{VERIFY_POOLS.map((p) => <PoolCard key={p.id} p={p} />)}</ul>;
}

function VerifyBody() {
  const t = useT();
  return <div className="grid min-w-0 gap-4">
    <p className="text-sm leading-6 text-muted-foreground">{t("Meteora es un protocolo público de liquidez en Solana: ahí viven las bóvedas y se cobran las comisiones de cada intercambio. Bóveda Market es solo la interfaz: entras con dólares y el Piloto Automático ajusta el rango y cobra por ti 24/7.")}</p>
    <VerifyPoolList />
    <p className="flex items-start gap-2 rounded-xl border border-border bg-secondary/50 p-3 text-xs leading-5 text-muted-foreground"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" /><span>{t("Tus fondos quedan en tu propia billetera dentro de esos pools públicos; Bóveda Market no los custodia.")} <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline"><GithubMark size={12} />{t("Código abierto en GitHub")}</a></span></p>
  </div>;
}

/** «Verificar pools oficiales» link + sheet, shown next to the Powered by Meteora badge on the home. */
export function VerifyPoolsLink() {
  const t = useT();
  return <Dialog>
    <DialogTrigger className="text-[11px] font-semibold text-primary underline underline-offset-2">{t("Verificar pools oficiales")} ↗</DialogTrigger>
    <ActionSheetContent>
      <DialogTitle className="pr-10 font-display text-xl">{t("Verifica las bóvedas en Meteora")}</DialogTitle>
      <DialogDescription className="sr-only">{t("Direcciones públicas de cada pool y enlaces oficiales para comprobarlas.")}</DialogDescription>
      <div className="mt-3"><VerifyBody /></div>
    </ActionSheetContent>
  </Dialog>;
}

/** Home section for the smart-vault page: what Meteora is, the proof per pool, and Autopilot as the value. */
export function VerifySection() {
  const t = useT();
  const points: [string, string][] = [
    ["Liquidez pública y real", "Las bóvedas son pools públicos de Meteora, uno de los protocolos de intercambio más usados de Solana. Puedes ver su volumen y comisiones en su web."],
    ["Sin custodia", "Tu dinero queda en tu propia billetera dentro del pool; Bóveda Market nunca lo guarda."],
    ["El valor es el Piloto Automático", "En Meteora directo calculas rangos y rebalanceas a mano. Aquí el Piloto Automático lo hace por ti 24/7."],
  ];
  return <section aria-label={t("Verifica las bóvedas en Meteora")} className="mb-4 py-8">
    <h2 className="font-display text-2xl font-bold">{t("Verifica las bóvedas en Meteora")}</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("No tienes que confiar en nuestra palabra: cada bóveda es un pool público que puedes abrir en Meteora y en el explorador de Solana.")}</p>
    <ul className="mt-5 grid gap-3 sm:grid-cols-3">{points.map(([h, b]) => <li key={h} className="rounded-2xl border border-border bg-card p-4"><p className="font-display font-semibold">{t(h)}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(b)}</p></li>)}</ul>
    <div className="mt-4"><VerifyPoolList /></div>
  </section>;
}
