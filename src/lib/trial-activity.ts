import { z } from "zod";

const activitySchema = z.object({ id: z.string(), kind: z.enum(["deposit", "harvest", "exit"]), vaultId: z.string(), gross: z.number().finite().nonnegative(), fee: z.number().finite().nonnegative(), net: z.number().finite().nonnegative(), at: z.number().finite().nonnegative() });
export type TrialActivity = z.infer<typeof activitySchema>;
export const trialActivityKey = (identity: string) => `boveda-trial-activity:${identity}`;
export const guestDemoKey = "boveda-guest-trial-v1";
export function readTrialActivity(raw: string | null): TrialActivity[] {
  try { const parsed = z.array(activitySchema).max(200).safeParse(raw ? JSON.parse(raw) : []); return parsed.success ? parsed.data : []; }
  catch { return []; }
}