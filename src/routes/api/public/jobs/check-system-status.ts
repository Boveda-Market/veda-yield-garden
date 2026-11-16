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
          const { migrateAlertsEnabled } = await import("@/lib/migrate-policy.server");
          if (!(await migrateAlertsEnabled())) throw new Error("migrate alerts off");
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
        try {
          // Sube/Baja results for linked users even while their app is closed; dedup shared with notifyPredictResults.
          const { listPositions, listRefunds } = await import("@/lib/predict.server");
          const { refundAlertText } = await import("@/lib/predict-refunds");
          const { resolvedOutcome, predictAlertText } = await import("@/lib/predict-alerts");
          const { data: links } = await db.from("telegram_links").select("privy_user_id, wallet").not("chat_id", "is", null).not("wallet", "is", null).eq("alerts_enabled", true).limit(200);
          for (const l of (links ?? []) as { privy_user_id: string; wallet: string }[]) {
            const live = await listPositions(l.wallet).catch(() => []);
            for (const p of live) {
              const o = resolvedOutcome(p);
              if (!o) continue;
              const { data: ins, error } = await db.from("predict_result_alerts").upsert({ privy_user_id: l.privy_user_id, position: p.pubkey, outcome: o }, { onConflict: "privy_user_id,position", ignoreDuplicates: true }).select("position");
              if (!error && ins?.length) await tg.userAlert(l.privy_user_id, predictAlertText(p, o), "predict");
            }
            // Orders refunded instead of entering the round (last 2 h), so nobody waits on a round they are not in.
            for (const r of await listRefunds(l.wallet, 7200).catch(() => [])) {
              const { data: ins, error } = await db.from("predict_result_alerts").upsert({ privy_user_id: l.privy_user_id, position: `order:${r.order}`, outcome: "refunded" }, { onConflict: "privy_user_id,position", ignoreDuplicates: true }).select("position");
              if (!error && ins?.length) await tg.userAlert(l.privy_user_id, refundAlertText(r), "predict");
            }
          }
        } catch { /* best-effort */ }
        try {
          // Treasury SOL reserve: sponsored activations fail without it; alert operator once, then on recovery.
          const key = process.env["HELIUS_API_KEY"];
          if (key) {
            const { PublicKey } = await import("@solana/web3.js");
            const { heliusConnection } = await import("@/lib/solana-read.server");
            const { FEE_WALLET } = await import("@/lib/fees");
            const { treasuryReserveAlert } = await import("@/lib/treasury-reserve");
            const lamports = BigInt(await heliusConnection(key).getBalance(new PublicKey(FEE_WALLET), "confirmed"));
            const prev = rows.get("treasury_sol");
            const a = treasuryReserveAlert(lamports, !!prev?.operator_alerted);
            const sol = (Number(lamports) / 1e9).toFixed(4);
            if (a === "low") await tg.treasuryAlert(`⛽ <b>Reserva de red de la tesorería baja</b>\nSaldo: ${sol} SOL\nLas activaciones automáticas de cuentas nuevas fallarán hasta recargarla.\n<code>${FEE_WALLET}</code>`);
            if (a === "restored") await tg.treasuryAlert(`🟢 <b>Reserva de tesorería restablecida</b>\nSaldo: ${sol} SOL`);
            if (a) await db.from("system_service_status").upsert({ service: "treasury_sol", first_down_at: a === "low" ? new Date(now).toISOString() : null, operator_alerted: a === "low", public_alerted: false, updated_at: new Date(now).toISOString() }, { onConflict: "service" });
          }
        } catch { /* best-effort */ }
        try {
          // Treasury self-refill: swap free treasury dollars into network reserve before it runs dry (4 h cooldown).
          const last = rows.get("treasury_topup")?.first_down_at;
          const { runTreasuryTopup } = await import("@/lib/treasury-topup.server");
          const r = await runTreasuryTopup({ lastAt: last ? Date.parse(last) : null });
          if (r.done) {
            await db.from("system_service_status").upsert({ service: "treasury_topup", first_down_at: new Date(now).toISOString(), operator_alerted: false, public_alerted: false, updated_at: new Date(now).toISOString() }, { onConflict: "service" });
            await tg.treasuryAlert(`🔄 <b>Auto-recarga de tesorería</b>\n$${(Number(r.amountMicro) / 1e6).toFixed(2)} → ~${(Number(r.receivedLamports) / 1e9).toFixed(4)} SOL\nReserva antes: ${(Number(r.solBefore) / 1e9).toFixed(4)} SOL`);
          } else if (r.reason === "no-sol" || r.reason === "no-dollars") {
            const k = "treasury_topup_blocked", prev = rows.get(k)?.first_down_at;
            if (!prev || now - Date.parse(prev) > 6 * 3600_000) {
              await tg.treasuryAlert(r.reason === "no-sol" ? "⚠️ <b>Auto-recarga imposible</b>: la reserva está bajo 0.0025 SOL. Envía SOL a la tesorería." : "⚠️ <b>Auto-recarga imposible</b>: menos de $5 libres en la tesorería.");
              await db.from("system_service_status").upsert({ service: k, first_down_at: new Date(now).toISOString(), operator_alerted: true, public_alerted: false, updated_at: new Date(now).toISOString() }, { onConflict: "service" });
            }
          }
        } catch { /* best-effort */ }
        try {
          // Range vaults: track out-of-range time per position; one personal alert after 10 min, reset when back in range or rebalanced.
          const key = process.env["HELIUS_API_KEY"];
          if (key) {
            const { PublicKey } = await import("@solana/web3.js");
            const { heliusConnection } = await import("@/lib/solana-read.server");
            const { readDlmmPositions } = await import("@/lib/dlmm.server");
            const { trackRangePositions } = await import("@/lib/range-monitor");
            const { VAULTS } = await import("@/lib/vaults");
            const connection = heliusConnection(key);
            const vaultName = (id: string) => VAULTS.find((v) => v.id === id)?.name ?? "bóveda";
            // Autopilot first (5 min out of range): when it re-centres a position, the 10-min alert below never fires.
            try {
              const { runAutopilot } = await import("@/lib/autopilot.server");
              await runAutopilot({ db, connection, rows, now, vaultName, alert: (id, html, button) => tg.userAlert(id, html, "range", button) });
            } catch { /* best-effort: alerts below stay the fallback */ }
            const { data: links } = await db.from("telegram_links").select("privy_user_id, wallet").not("chat_id", "is", null).not("wallet", "is", null).eq("alerts_enabled", true).limit(200);
            for (const l of (links ?? []) as { privy_user_id: string; wallet: string }[]) {
              const positions = await readDlmmPositions(connection, new PublicKey(l.wallet)).catch(() => null);
              if (!positions) continue;
              await trackRangePositions({
                privyUserId: l.privy_user_id, positions, rows, now,
                store: { save: (row) => db.from("system_service_status").upsert(row, { onConflict: "service" }), clear: (service) => db.from("system_service_status").delete().eq("service", service) },
                alert: (id, html, button) => tg.userAlert(id, html, "range", button),
                vaultName,
              });
            }
          }
        } catch { /* best-effort */ }
        return Response.json({ ok: true, down: checks.filter((c) => c.state === "down").map((c) => c.id) });
      },
    },
  },
});
