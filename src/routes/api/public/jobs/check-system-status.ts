import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { probeServices } from "@/lib/system-status.functions";
import { decide, type MonitorRow } from "@/lib/status-monitor";

const NAMES: Record<string, string> = { network: "Red y transacciones", vaults: "Bóvedas", predict: "Predicciones Sube o Baja", markets: "Mercados de predicción", wallets: "Billeteras e inicio de sesión", funding: "Compra y retiro de fondos" };

export const Route = createFileRoute("/api/public/jobs/check-system-status")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const fail = await authenticateCronRequest(request);
        if (fail) return fail;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const tg = await import("@/lib/telegram.server");
        const checks = await probeServices(process.env["JUPITER_API_KEY"]);
        const db = supabaseAdmin as unknown as { from: (t: string) => any };
        const { data } = await db.from("system_service_status").select("*");
        const rows = new Map<string, MonitorRow>(((data ?? []) as MonitorRow[]).map((r) => [r.service, r]));
        const now = Date.now();
        for (const c of checks) {
          const prev = rows.get(c.id) ?? { service: c.id, first_down_at: null, operator_alerted: false, public_alerted: false };
          const a = decide(prev, c.state === "down", now);
          const name = NAMES[c.id] ?? c.id;
          if (a.operatorDown) await tg.treasuryAlert(`🔴 <b>Servicio caído</b>: ${name}\nSin respuesta en la comprobación automática.`);
          if (a.publicDown) await tg.sendTelegram(tg.TELEGRAM_CHANNEL, `🟠 <b>Incidencia en curso</b>\n\n${name} presenta interrupciones. Tus fondos siguen seguros y bajo tu control; el equipo ya está trabajando en ello.\n\n🔗 <a href="https://bovedamarket.app/status">Estado del sistema</a>`);
          if (a.operatorUp) await tg.treasuryAlert(`🟢 <b>Recuperado</b>: ${name}`);
          if (a.publicUp) await tg.sendTelegram(tg.TELEGRAM_CHANNEL, `🟢 <b>Servicio restablecido</b>\n\n${name} vuelve a operar con total normalidad.`);
          await db.from("system_service_status").upsert({ ...a.next, updated_at: new Date(now).toISOString() }, { onConflict: "service" });
        }
        try {
          const { VAULTS } = await import("@/lib/vaults");
          const { fetchPoolYield } = await import("@/lib/pool-yield");
          const { bestUpgrade, gapAlertDue } = await import("@/lib/migrate");
          const ys = await Promise.all(VAULTS.map((v) => fetchPoolYield(v.pool).catch(() => null)));
          const aprs = Object.fromEntries(VAULTS.map((v, i) => [v.id, ys[i]?.apr ?? null]));
          const best = VAULTS.map((v) => ({ v, up: bestUpgrade(v.id, aprs) })).find((x) => x.up);
          const last = rows.get("apr_gap")?.first_down_at;
          if (best?.up && gapAlertDue(last, now)) {
            const to = VAULTS.find((v) => v.id === best.up!.id);
            const ok = await tg.sendTelegram(tg.TELEGRAM_CHANNEL, `⚡ <b>Traslado gratis disponible</b>\n\n${to?.name} rinde <b>+${best.up.gain.toFixed(1)}% APR</b> más que ${best.v.name} ahora mismo.\n\nSi tienes capital en ${best.v.name}, entra a tu Portafolio y toca «Migrar gratis»: 0% de comisión de BÓVEDA al salir y al depositar.\n\n🔗 <a href="https://bovedamarket.app/portfolio">Abrir Portafolio</a>`);
            if (ok) await db.from("system_service_status").upsert({ service: "apr_gap", first_down_at: new Date(now).toISOString(), operator_alerted: false, public_alerted: false, updated_at: new Date(now).toISOString() }, { onConflict: "service" });
          }
        } catch { /* best-effort; never blocks status checks */ }
        return Response.json({ ok: true, down: checks.filter((c) => c.state === "down").map((c) => c.id) });
      },
    },
  },
});
