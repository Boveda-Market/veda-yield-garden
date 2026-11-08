import { z } from "zod";

const activitySchema = z.object({ id: z.string(), kind: z.enum(["deposit", "harvest", "exit"]), vaultId: z.string(), gross: z.number().finite().nonnegative(), fee: z.number().finite().nonnegative(), net: z.number().finite().nonnegative(), at: z.number().finite().nonnegative() });
export type TrialActivity = z.infer<typeof activitySchema>;
export const trialActivityKey = (identity: string) => `boveda-trial-activity:${identity}`;
export const guestDemoKey = "boveda-guest-trial-v1";
export function readTrialActivity(raw: string | null): TrialActivity[] {
  try { const parsed = z.array(activitySchema).max(200).safeParse(raw ? JSON.parse(raw) : []); return parsed.success ? parsed.data : []; }
  catch { return []; }
}

/** Net harvested credits / deposited credits in the recorded trial history.
 * Exits include returned capital, so they are never counted as harvests.
 */
export function trialHarvestSummary(rows: TrialActivity[]) {
  const harvested = rows.filter((row) => row.kind === "harvest").reduce((sum, row) => sum + Math.round(row.net * 1_000_000), 0) / 1_000_000;
  const deposited = rows.filter((row) => row.kind === "deposit").reduce((sum, row) => sum + Math.round(row.net * 1_000_000), 0) / 1_000_000;
  return { harvested, percent: deposited > 0 ? harvested / deposited * 100 : null };
}