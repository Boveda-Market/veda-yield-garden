import { useT } from "@/lib/i18n";
import type { RealWalletData } from "@/lib/solana-data";
import { MeteoraPortfolio } from "./meteora-portfolio";

/** Real portfolio history: vault movements, breakdown and methodology. Wallet balance charts live in Mi wallet. */
export function RealPortfolioPanel({ data, wallet }: { data: RealWalletData | null; wallet: string | null }) {
  const t = useT();
  return <section className="border-b border-border py-8" aria-label={t("Análisis del portafolio Real")}><MeteoraPortfolio wallet={wallet} positions={data?.positions ?? []} /></section>;
}
