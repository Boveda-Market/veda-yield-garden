import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Weekly market pulse (Tuesdays): builds the post from live public data and sends it only to the operator's private chat as a draft; never posts to the channel. */
export const Route = createFileRoute("/api/public/jobs/market-pulse")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const fail = await authenticateCronRequest(request);
        if (fail) return fail;
        const { buildMarketPulse } = await import("@/lib/weekly-pulse.server");
        const tg = await import("@/lib/telegram.server");
        const { PULSE_DRAFT_LABEL } = await import("@/lib/weekly-pulse");
        const post = await buildMarketPulse();
        const chat = process.env["TELEGRAM_ALERT_CHAT_ID"];
        const ok = chat ? await tg.sendTelegram(chat, `${PULSE_DRAFT_LABEL}\n\n${post}`) : false;
        return Response.json({ ok });
      },
    },
  },
});
