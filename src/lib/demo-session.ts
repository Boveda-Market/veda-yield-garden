import { z } from "zod";

const demoSchema = z.object({
  wallet: z.number().finite().nonnegative(),
  positions: z.array(z.object({
    id: z.string(), vaultId: z.string(), principal: z.number().finite().nonnegative(),
    openedAt: z.number().finite().nonnegative(), claimed: z.number().finite().nonnegative(),
  })),
});

export const demoSessionKey = (userId: string) => `boveda-demo-v2:${userId}`;

export function readDemoSession(raw: string | null) {
  try {
    const result = demoSchema.safeParse(raw ? JSON.parse(raw) : null);
    if (result.success) return result.data;
  } catch { /* Invalid local demo data must not prevent sign-in. */ }
  return { wallet: 1000, positions: [] };
}