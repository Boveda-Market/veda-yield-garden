import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Weekly Telegram summary (Mondays): interest harvested over the last 7 days for every linked wallet; muted via kind "weekly". */
export const Route = createFileRoute("/api/public/jobs/weekly-summary")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const fail = await authenticateCronRequest(request);
        if (fail) return fail;
        const key = process.env["HELIUS_API_KEY"];
        if (!key) return Response.json({ ok: false, error: "no-rpc" });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { readMeteoraHistory } = await import("@/lib/meteora-history.server");
        const { weeklyInterest, weekTotalMicro, weeklySummaryText } = await import("@/lib/weekly-interest");
        const tg = await import("@/lib/telegram.server");
        const db = supabaseAdmin as unknown as { from: (t: string) => any };
        const { data: links } = await db.from("telegram_links").select("privy_user_id, wallet").not("chat_id", "is", null).not("wallet", "is", null).eq("alerts_enabled", true).limit(500);
        const now = Date.now(), PR = -240;
        const fmt = (t: number) => new Date(t + PR * 60_000).toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "UTC" });
        let sent = 0;
        for (const l of (links ?? []) as { privy_user_id: string; wallet: string }[]) {
          try {
            const records = [];
            let before: string | undefined;
            for (let i = 0; i < 4; i++) { // up to 100 recent transactions is plenty for one week
              const page = await readMeteoraHistory(key, l.wallet, before);
              records.push(...page.records);
              const oldest = Math.min(...page.records.map((r) => r.at ?? now));
              if (!page.next || oldest < now - 7 * 86_400_000) break;
              before = page.next;
            }
            const days = weeklyInterest(records, now, PR);
            const harvests = records.filter((r) => r.kind === "harvest" && r.at && r.at >= days[0]!.start).length;
            const hasVault = records.some((r) => r.kind === "deposit");
            if (!hasVault) continue; // only people with vault activity get the summary
            await tg.userAlert(l.privy_user_id, weeklySummaryText({ weekMicro: weekTotalMicro(days), harvests, from: fmt(days[0]!.start), to: fmt(days[6]!.start) }), "weekly", { text: "👉 Ver mi portafolio", url: "https://bovedamarket.app/portfolio" });
            sent++;
          } catch { /* one wallet never blocks the rest */ }
        }
        return Response.json({ ok: true, sent });
      },
    },
  },
});
