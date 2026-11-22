import { Crown, Gem, Sparkles, Circle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAccountTier } from "@/hooks/use-account-tier";

const styles = [
  { Icon: Circle, cls: "bg-muted text-muted-foreground" },
  { Icon: Sparkles, cls: "bg-primary/10 text-primary" },
  { Icon: Gem, cls: "bg-accent text-accent-foreground" },
  { Icon: Crown, cls: "bg-secondary text-secondary-foreground ring-1 ring-primary/40" },
];
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function TierBadge({ index, name }: { index: number; name: string }) {
  const t = useT();
  const { Icon, cls } = styles[index] ?? styles[0]!;
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${cls}`}><Icon size={14} />{t("Nivel")} {name}</span>;
}

export function TierCard({ wallet }: { wallet: string | null | undefined }) {
  const t = useT();
  const tier = useAccountTier(wallet);
  if (!tier) return null;
  return <div className="rounded-2xl border border-border bg-card p-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-display text-xl font-semibold">{t("Tu nivel")}</h2>
      <TierBadge index={tier.index} name={tier.name} />
    </div>
    <p className="mt-2 text-sm text-muted-foreground">{t("Según tu saldo total en Bóveda Market:")} {usd(tier.total)}</p>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${tier.progress}%` }} /></div>
    <p className="mt-2 text-sm">{tier.next ? `${t("Te faltan")} ${usd(tier.missing)} ${t("para el nivel")} ${tier.next} ${t("y intereses más bajas.")}` : t("Tienes las comisiones más bajas de Bóveda Market.")}</p>
  </div>;
}
