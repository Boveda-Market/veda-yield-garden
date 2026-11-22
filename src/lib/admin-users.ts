import { z } from "zod";

/** Presence window: a person counts as connected when the app pinged within this time. */
export const ONLINE_MS = 2 * 60_000;
export const PING_MS = 60_000;

export const presencePingRequest = z.object({
  visitorId: z.string().uuid(),
  screen: z.string().regex(/^[a-z0-9-]{0,32}$/),
  token: z.string().min(1).max(4096).optional(),
}).strict();

export type AdminUser = {
  id: string;
  createdAt: string | null;
  email: string | null;
  name: string | null;
  wallet: string | null;
  lastSeen: string | null;
  screen: string | null;
  recharged: boolean;
  telegram: boolean;
  autopilot: boolean;
  affiliate: string | null;
};

export type AdminOverview = {
  onlineUsers: number;
  onlineVisitors: number;
  activeUsers24h: number;
  visitors24h: number;
  unreadSuggestions: number;
  pendingPayoutRaw: string;
  payoutsDue: number;
};

export type UserFilter = "all" | "online" | "new" | "nodeposit" | "vault";

export type Holdings = { usdc: number; vaults: number };

/** Pure list filter for the Users section; deposit filters only apply to accounts whose balance was checked. */
export function filterUsers(users: AdminUser[], f: UserFilter, q: string, now: number, holdings: Record<string, Holdings | undefined> = {}) {
  const s = q.trim().toLowerCase();
  return users.filter((u) => {
    if (s && ![u.email, u.name, u.wallet, u.affiliate].some((v) => v?.toLowerCase().includes(s))) return false;
    if (f === "online") return isOnline(u.lastSeen, now);
    if (f === "new") return !!u.createdAt && now - Date.parse(u.createdAt) <= 7 * 86_400_000;
    const h = u.wallet ? holdings[u.wallet] : undefined;
    if (f === "vault") return !!h && h.vaults > 0;
    if (f === "nodeposit") return !!h && h.vaults === 0;
    return true;
  });
}

export function isOnline(lastSeen: string | null, now: number) {
  return !!lastSeen && now - Date.parse(lastSeen) <= ONLINE_MS;
}
