import { Bot, Check, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VerifySection } from "@/components/meteora-verify";
import { GITHUB_REPO_URL, GithubMark } from "@/components/github-link";

const ROWS: [string, string][] = [
  ["Calcular rangos de precio y curvas de liquidez a mano.", "Depositas dólares y el sistema fija el rango en un toque."],
  ["Si el precio sale del rango dejas de cobrar hasta que rebalanceas tú.", "El Piloto Automático rebalancea por ti, 24/7."],
  ["Comprar las dos monedas por separado antes de armar la posición.", "Entras solo con dólares: el sistema compra y aporta por ti."],
  ["Desarmar, cambiar y enviar a un exchange para retirar.", "Cierras a dólares y retiras a tu banco o Cash App."],
];

/** "Smart vaults" home version: the pain of manual ranges/rebalances on public pools, and Autopilot as the fix. */
export function SmartHero({ title, sub }: { title: string; sub: string }) {
  const t = useT();
  return <div className="overflow-hidden meteora-skin rounded-3xl border border-[var(--mt-border)] text-[var(--mt-text)] shadow-sm">
    <div className="px-5 pb-5 pt-5 text-center sm:px-8 sm:pt-7 md:text-left">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mt-border)] bg-[var(--mt-bg)]/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--mt-accent)]"><Bot size={12} aria-hidden />{t("Bóvedas inteligentes · Liquidez automatizada")}</span>
      <h1 className="mt-3 font-display text-[1.7rem] font-bold leading-tight sm:text-4xl">{t(title)}</h1>
      <p className="mt-2 text-sm leading-6 sm:text-base text-[var(--mt-muted)]">{t(sub)}</p>
    </div>
  </div>;
}

/** Manual pool management vs smart vault, shown under the smart hero. */
export function SmartSections() {
  const t = useT();
  return <section aria-label={t("A mano vs. bóveda inteligente")} className="mb-4 py-8">
    <h2 className="font-display text-2xl font-bold">{t("A mano vs. bóveda inteligente")}</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("Aportar liquidez en bóvedas públicas como Meteora u Orca paga comisiones, pero mantenerla activa a mano es un trabajo de tiempo completo.")}</p>
    <ul className="mt-5 grid gap-3">{ROWS.map(([manual, smart]) => <li key={manual} className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
      <p className="flex gap-2 text-sm leading-6 text-muted-foreground"><X size={16} aria-hidden className="mt-1 shrink-0 text-destructive" /><span><span className="sr-only">{t("A mano")}: </span>{t(manual)}</span></p>
      <p className="flex gap-2 text-sm font-semibold leading-6"><Check size={16} aria-hidden className="mt-1 shrink-0 text-primary" /><span><span className="sr-only">{t("Bóveda inteligente")}: </span>{t(smart)}</span></p>
    </li>)}
      <li className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
        <p className="flex gap-2 text-sm leading-6 text-muted-foreground"><X size={16} aria-hidden className="mt-1 shrink-0 text-destructive" /><span><span className="sr-only">{t("A mano")}: </span>{t("Sistemas cerrados o contratos sin verificación pública.")}</span></p>
        <p className="flex gap-2 text-sm font-semibold leading-6"><Check size={16} aria-hidden className="mt-1 shrink-0 text-primary" /><span><span className="sr-only">{t("Bóveda inteligente")}: </span>{t("Código abierto y transparente en GitHub.")} <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline"><GithubMark size={13} />{t("Ver en GitHub")}</a></span></p>
      </li>
    </ul>
  </section>;
}

