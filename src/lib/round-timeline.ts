import type { PastRound, PredictSide } from "@/lib/predict";

/** Pure: current streak of the latest resolved rounds (same winner in a row), newest last in the input. */
export function roundStreak(rounds: readonly Pick<PastRound, "winner">[]): { side: PredictSide; count: number } | null {
  const last = rounds.at(-1);
  if (!last) return null;
  let count = 0;
  for (let i = rounds.length - 1; i >= 0 && rounds[i]!.winner === last.winner; i--) count++;
  return { side: last.winner, count };
}

/** Pure: opening times (seconds) of the next rounds after the one closing at closeTime. */
export const upcomingOpens = (closeTime: number, durationSec: number, n = 2) => Array.from({ length: n }, (_, i) => closeTime + i * durationSec);
