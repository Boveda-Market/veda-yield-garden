import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Weekly channel post (Tuesdays): mainstream RSS headlines (X accounts as backup), rewritten in plain Spanish, sent only to the operator's private chat as a draft; never posts to the channel. Falls back to the market pulse when X news can't be read. */
export const Route = createFileRoute("/api/public/jobs/market-pulse")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const fail = await authenticateCronRequest(request);
        if (fail) return fail;
        const tg = await import("@/lib/telegram.server");
        const { PULSE_DRAFT_LABEL } = await import("@/lib/weekly-pulse");
        let post: string | null = null;
        try { post = await (await import("@/lib/weekly-news.server")).buildNewsDigest(); } catch (e) { console.error("weekly news failed:", e); }
        if (!post) post = await (await import("@/lib/weekly-pulse.server")).buildMarketPulse();
        const ok = await tg.sendPulseDraft(PULSE_DRAFT_LABEL, post);
        return Response.json({ ok });
      },
    },
  },
});
