import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Daily check; on the cycle's random day (every 14 days) sends a promo draft only to the operator's private chat. Pass {"force":true} to send now. */
export const Route = createFileRoute("/api/public/jobs/promo-post")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const fail = await authenticateCronRequest(request);
        if (fail) return fail;
        const body = (await request.json().catch(() => ({}))) as { force?: boolean };
        const { promoCycleFor, PROMO_DRAFT_LABEL, PROMO_START } = await import("@/lib/promo-posts");
        const now = Date.now();
        const cycle = body.force === true ? Math.max(0, Math.floor((now - PROMO_START) / (14 * 86_400_000))) : promoCycleFor(now);
        if (cycle === null) return Response.json({ ok: true, skipped: true });
        const { buildPromo } = await import("@/lib/promo-posts.server");
        const post = await buildPromo(cycle);
        if (!post) return Response.json({ ok: false, reason: "no data" });
        const tg = await import("@/lib/telegram.server");
        return Response.json({ ok: await tg.sendPulseDraft(PROMO_DRAFT_LABEL, post) });
      },
    },
  },
});
