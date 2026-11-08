import { z } from "zod";

/** A deposit or withdrawal sent for review. Amounts are display units (USDC or credits). */
export const reviewMovementSchema = z.object({
  id: z.string().min(1).max(200),
  kind: z.enum(["deposit", "withdraw"]),
  vault: z.string().min(1).max(40),
  amount: z.number().finite().nonnegative().max(1e12),
  at: z.number().finite().nonnegative().nullable(),
});
export type ReviewMovement = z.infer<typeof reviewMovementSchema>;
export const MAX_REVIEW_MOVEMENTS = 60;
export const movementReviewInput = z.object({ movements: z.array(reviewMovementSchema).min(1).max(MAX_REVIEW_MOVEMENTS) }).strict();

export type MovementFlag = { id: string; reason: string };
export type MovementReviewResult = { success: true; flags: MovementFlag[] } | { success: false; error: string };

const flagsSchema = z.object({ flags: z.array(z.object({ id: z.string(), reason: z.string() })).max(MAX_REVIEW_MOVEMENTS) });

/** Accept only flags for movements that were actually sent, once each, with a short reason. */
export function sanitizeFlags(raw: unknown, movements: ReviewMovement[]): MovementFlag[] {
  const parsed = flagsSchema.safeParse(raw);
  if (!parsed.success) return [];
  const known = new Set(movements.map((m) => m.id));
  const seen = new Set<string>();
  const out: MovementFlag[] = [];
  for (const flag of parsed.data.flags) {
    const reason = flag.reason.trim().replace(/\s+/g, " ").slice(0, 160);
    if (!known.has(flag.id) || seen.has(flag.id) || !reason) continue;
    seen.add(flag.id);
    out.push({ id: flag.id, reason });
  }
  return out;
}

/** Only deposits and withdrawals are reviewed, never harvests or closes. */
export function reviewableMovements<T extends { kind: string }>(rows: T[]) {
  return rows.filter((row) => row.kind === "deposit" || row.kind === "withdraw" || row.kind === "exit");
}
