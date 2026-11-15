import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useT } from "@/lib/i18n";
import { getPastRounds } from "@/lib/predict.functions";
import { roundStreak, upcomingOpens } from "@/lib/round-timeline";
import { WINDOW_SECONDS } from "@/lib/price-to-beat";
import type { LiveRound, PredictAsset, PredictWindow } from "@/lib/predict";

const hm = (sec: number) => new Date(sec * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** Strip under the chart: latest official results (oldest → newest), the live round and the next openings, plus the streak. */
export function RoundTimeline({ asset, window, round }: { asset: PredictAsset; window: PredictWindow; round: LiveRound | null }) {
  const t = useT();
  const read = useServerFn(getPastRounds);
  const q = useQuery({ queryKey: ["predict-past"], queryFn: () => read(), refetchInterval: 60_000, staleTime: 30_000 });
  const past = (q.data?.success ? q.data.rounds : []).filter((r) => r.asset === asset && r.window === window).sort((a, b) => a.endTime - b.endTime).slice(-5);
  const streak = roundStreak(past);
  const next = round ? upcomingOpens(round.closeTime, WINDOW_SECONDS[window], 1) : [];
  if (!past.length && !round) return null;
  return <div className="space-y-1.5 px-1" aria-label={t("Rondas recientes y próximas")}>
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      {past.map((r) => <span key={r.slug} title={`${hm(r.endTime)} · ${t(r.winner === "up" ? "Ganó Sube" : "Ganó Baja")}`} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${r.winner === "up" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>{r.winner === "up" ? "▲" : "▼"}</span>)}
      {round && <span className="flex shrink-0 items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold text-background"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />{t("Ahora")}</span>}
      {next.map((s) => <span key={s} className="shrink-0 rounded-full border border-border px-2 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">{t("Próxima")} {hm(s)}</span>)}
    </div>
    {streak && streak.count >= 2 && <p className="text-[11px] font-semibold text-muted-foreground">🔥 {t(streak.side === "up" ? "Racha: {n} rondas seguidas ganó Sube" : "Racha: {n} rondas seguidas ganó Baja", { n: streak.count })}</p>}
  </div>;
}
