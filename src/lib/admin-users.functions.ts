import { createServerFn } from "@tanstack/react-start";
import { payoutAdminRequest, PAYOUT_MIN_MICRO } from "./affiliate";
import { ONLINE_MS, presencePingRequest, type AdminOverview, type AdminUser } from "./admin-users";

type Fail = { success: false; error: string };
const APP_ID = "cmw6ftcf900ge0hl0jyw3rc75";

/** Public heartbeat: signed-in pings are keyed by the verified Privy subject, visitors by an anonymous browser id (no personal data). */
export const presencePing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => presencePingRequest.parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
      let privy: string | null = null;
      if (data.token) { try { const { verifiedPrivyId } = await import("./account-profile.server"); privy = await verifiedPrivyId(data.token); } catch { privy = null; } }
      const id = privy ? `u:${privy}` : `v:${data.visitorId}`;
      const now = new Date().toISOString();
      const { error } = await db.from("app_presence").upsert({ id, privy_user_id: privy, screen: data.screen, last_seen: now }, { onConflict: "id", ignoreDuplicates: false });
      if (privy) await db.from("app_presence").delete().eq("id", `v:${data.visitorId}`);
      if (Math.random() < 0.02) await db.from("app_presence").delete().is("privy_user_id", null).lt("last_seen", new Date(Date.now() - 86_400_000).toISOString());
      return { ok: !error };
    } catch { return { ok: false }; }
  });

/** Operator-only: headline counters for the Control Panel summary. */
export const getAdminOverview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => payoutAdminRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true; data: AdminOverview } | Fail> => {
    try {
      const { payoutAdmin } = await import("./affiliate.functions");
      const { db } = await payoutAdmin(data.token);
      const online = new Date(Date.now() - ONLINE_MS).toISOString(), day = new Date(Date.now() - 86_400_000).toISOString();
      const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
      const [onlineUsers, onlineVisitors, activeUsers24h, visitors24h, unreadSuggestions, earn] = await Promise.all([
        count(db.from("app_presence").select("id", { count: "exact", head: true }).not("privy_user_id", "is", null).gte("last_seen", online)),
        count(db.from("app_presence").select("id", { count: "exact", head: true }).is("privy_user_id", null).gte("last_seen", online)),
        count(db.from("app_presence").select("id", { count: "exact", head: true }).not("privy_user_id", "is", null).gte("last_seen", day)),
        count(db.from("app_presence").select("id", { count: "exact", head: true }).is("privy_user_id", null).gte("last_seen", day)),
        count(db.from("user_suggestions").select("id", { count: "exact", head: true }).eq("status", "unread")),
        db.from("affiliate_earnings").select("affiliate_privy_id, commission_raw").eq("status", "pending").limit(10000),
      ]);
      const per = new Map<string, bigint>();
      for (const r of earn.data ?? []) per.set(r.affiliate_privy_id, (per.get(r.affiliate_privy_id) ?? 0n) + BigInt(r.commission_raw));
      const pending = [...per.values()].reduce((a, v) => a + v, 0n);
      return { success: true, data: { onlineUsers, onlineVisitors, activeUsers24h, visitors24h, unreadSuggestions, pendingPayoutRaw: pending.toString(), payoutsDue: [...per.values()].filter((v) => v >= PAYOUT_MIN_MICRO).length } };
    } catch { return { success: false, error: "Solo la wallet de tesorería verificada puede ver este panel." }; }
  });

type PrivyAccount = { type: string; address?: string; email?: string; name?: string | null; chain_type?: string; wallet_client_type?: string };
type PrivyUser = { id: string; created_at?: number; linked_accounts?: PrivyAccount[] };

/** Operator-only: every account (Privy users API, up to 1,000) joined with presence, top-ups, Telegram, Autopilot and partner code. Never returns tokens. */
export const listAdminUsers = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => payoutAdminRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true; users: AdminUser[]; truncated: boolean } | Fail> => {
    let db;
    try { const { payoutAdmin } = await import("./affiliate.functions"); ({ db } = await payoutAdmin(data.token)); }
    catch { return { success: false, error: "Solo la wallet de tesorería verificada puede ver este panel." }; }
    const secret = process.env["PRIVY_APP_SECRET"];
    if (!secret) return { success: false, error: "La lista de cuentas no está disponible ahora mismo." };
    try {
      const people: PrivyUser[] = [];
      let cursor: string | null = null, truncated = false;
      for (let page = 0; page < 10; page++) {
        const qs = new URLSearchParams({ limit: "100" }); if (cursor) qs.set("cursor", cursor);
        const res = await fetch(`https://api.privy.io/v1/users?${qs}`, { headers: { Authorization: `Basic ${btoa(`${APP_ID}:${secret}`)}`, "privy-app-id": APP_ID }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) { console.error(`Privy users [${res.status}]`); return { success: false, error: "No se pudo leer la lista de cuentas. Inténtalo de nuevo." }; }
        const body = (await res.json()) as { data?: PrivyUser[]; next_cursor?: string | null };
        people.push(...(body.data ?? []));
        cursor = body.next_cursor ?? null;
        if (!cursor) break;
        if (page === 9) truncated = true;
      }
      const [pres, prof, ramps, tg, auto, aff] = await Promise.all([
        db.from("app_presence").select("privy_user_id, last_seen, screen").not("privy_user_id", "is", null).limit(5000),
        db.from("account_profiles").select("privy_user_id, display_name").limit(5000),
        db.from("coinbase_onramps").select("privy_user_id").limit(5000),
        db.from("telegram_links").select("privy_user_id, linked_at").limit(5000),
        db.from("autopilot_enrollments").select("privy_user_id, enabled").limit(5000),
        db.from("affiliates").select("privy_user_id, code").limit(5000),
      ]);
      const by = <T extends { privy_user_id: string | null }>(rows: T[] | null) => new Map((rows ?? []).map((r) => [r.privy_user_id ?? "", r]));
      const P = by(pres.data), N = by(prof.data), R = by(ramps.data), T = by(tg.data), A = by(aff.data);
      const auto2 = new Set((auto.data ?? []).filter((r) => r.enabled).map((r) => r.privy_user_id));
      const users: AdminUser[] = people.map((u) => {
        const acc = u.linked_accounts ?? [];
        const google = acc.find((a) => a.type === "google_oauth");
        const email = acc.find((a) => a.type === "email")?.address ?? google?.email ?? null;
        const wallet = acc.find((a) => a.type === "wallet" && a.chain_type === "solana" && a.wallet_client_type === "privy")?.address ?? acc.find((a) => a.type === "wallet" && a.chain_type === "solana")?.address ?? null;
        const p = P.get(u.id);
        return {
          id: u.id,
          createdAt: u.created_at ? new Date(u.created_at * 1000).toISOString() : null,
          email, name: (N.get(u.id)?.display_name || google?.name) ?? null, wallet,
          lastSeen: p?.last_seen ?? null, screen: p?.screen || null,
          recharged: R.has(u.id), telegram: !!T.get(u.id)?.linked_at, autopilot: auto2.has(u.id), affiliate: A.get(u.id)?.code ?? null,
        };
      }).sort((a, b) => (b.lastSeen ?? b.createdAt ?? "").localeCompare(a.lastSeen ?? a.createdAt ?? ""));
      return { success: true, users, truncated };
    } catch { return { success: false, error: "No se pudo leer la lista de cuentas. Inténtalo de nuevo." }; }
  });
