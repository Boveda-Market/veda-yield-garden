import { tgCard, tgRow } from "@/lib/telegram-format";

type HarvestLike = { kind: string; at: number | null; usdcRaw: string };
export type DayBucket = { key: string; start: number; micro: bigint };

const DAY = 86_400_000;
/** Start of the local day for `t`, given the viewer's UTC offset in minutes (e.g. -240 for Puerto Rico). */
const dayStart = (t: number, offsetMin: number) => { const shifted = t + offsetMin * 60_000; return shifted - (((shifted % DAY) + DAY) % DAY) - offsetMin * 60_000; };

/** Last 7 local days (oldest first, today last) with the dollars harvested each day (USDC part, integer micro). */
export function weeklyInterest(records: readonly HarvestLike[], now: number, offsetMin = 0): DayBucket[] {
  const today = dayStart(now, offsetMin);
  const days: DayBucket[] = Array.from({ length: 7 }, (_, i) => { const start = today - (6 - i) * DAY; return { key: new Date(start + offsetMin * 60_000).toISOString().slice(0, 10), start, micro: 0n }; });
  for (const r of records) {
    if (r.kind !== "harvest" || !r.at || !/^\d{1,20}$/.test(r.usdcRaw)) continue;
    const idx = Math.floor((r.at - days[0]!.start) / DAY);
    if (idx >= 0 && idx < 7) days[idx]!.micro += BigInt(r.usdcRaw);
  }
  return days;
}

export const weekTotalMicro = (days: readonly DayBucket[]) => days.reduce((s, d) => s + d.micro, 0n);
const usd = (m: bigint) => `$${(Number(m) / 1e6).toFixed(2)}`;

/** Weekly Telegram summary (Spanish, HTML). Never mentions fees; informational, so it says no action is needed. */
export function weeklySummaryText(o: { weekMicro: bigint; harvests: number; from: string; to: string }) {
  return tgCard("📊", "Tu resumen semanal en BÓVEDA", [
    `<i>Semana del ${o.from} al ${o.to}</i>`,
    "",
    tgRow("💰", "Intereses cosechados", `+${usd(o.weekMicro)}`),
    tgRow("🌾", "Cosechas", String(o.harvests)),
    "",
    o.weekMicro > 0n ? "✅ Tu dinero sigue trabajando y generando intereses día y noche." : "🌱 Tus intereses se siguen acumulando en tu bóveda; cósechalos cuando quieras.",
    "✨ <b>No tienes que hacer ninguna acción.</b>",
  ]);
}
