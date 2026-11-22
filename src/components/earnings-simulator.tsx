import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { poolYieldOptions } from "@/lib/pool-yield";
import { VAULTS } from "@/lib/vaults";
import { SIM_MAX_USD, SIM_MIN_USD, SIM_PRESETS, simulateEarnings } from "@/lib/earnings-sim";
import { formatUsd } from "@/lib/position-value";
import { useT } from "@/lib/i18n";

const SIM_VAULTS = ["gta6", "dcty", "trump"].map((id) => VAULTS.find((v) => v.id === id)).filter((v) => v != null);

/** Hypothetical deposit × the vault's live estimated APR: gross interest per day and per 30 days. */
export function EarningsSimulator() {
  const t = useT();
  const [vaultId, setVaultId] = useState(SIM_VAULTS[0]?.id ?? "gta6");
  const [amount, setAmount] = useState(100);
  const vault = SIM_VAULTS.find((v) => v.id === vaultId) ?? SIM_VAULTS[0];
  const y = useQuery({ ...poolYieldOptions(vault?.pool ?? ""), enabled: !!vault });
  const sim = simulateEarnings(amount, y.data?.apr ?? null);
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/50"}`;
  return <div className="space-y-3 pt-3">
    <div role="radiogroup" aria-label={t("Bóveda")} className="flex flex-wrap gap-1.5">{SIM_VAULTS.map((v) => <button key={v.id} type="button" role="radio" aria-checked={v.id === vaultId} onClick={() => setVaultId(v.id)} className={chip(v.id === vaultId)}>${v.pair.split("/")[0]}</button>)}</div>
    <div>
      <div className="flex items-baseline justify-between"><label htmlFor="sim-amount" className="text-xs text-muted-foreground">{t("Si depositaras")}</label><span className="font-display text-xl font-semibold tabular-nums">${amount.toLocaleString("en-US")}</span></div>
      <input id="sim-amount" type="range" min={SIM_MIN_USD} max={SIM_MAX_USD} step={10} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1 w-full accent-primary" />
      <div className="mt-1 flex flex-wrap gap-1.5">{SIM_PRESETS.map((p) => <button key={p} type="button" onClick={() => setAmount(p)} className={chip(p === amount)}>${p.toLocaleString("en-US")}</button>)}</div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {[{ label: t("Por día"), v: sim?.perDay }, { label: t("En 30 días"), v: sim?.perMonth }].map(({ label, v }) => <div key={label} className="rounded-xl border border-border bg-card p-3">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-semibold tabular-nums text-primary">{v != null ? `≈ +${formatUsd(v)}` : y.isLoading ? t("Consultando…") : "—"}</p>
      </div>)}
    </div>
    <p className="text-[11px] leading-snug text-muted-foreground">{sim ? t("Estimado con los intereses de las últimas 24 h, sin interés compuesto. No es una promesa: los intereses cambian cada día y el precio de la moneda puede subir o bajar.") : y.isLoading ? null : t("Los intereses de esta bóveda no están disponibles ahora. Prueba en unos minutos.")}</p>
  </div>;
}
