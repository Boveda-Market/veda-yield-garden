import type { Connection } from "@solana/web3.js";
import type { MonitorRow } from "@/lib/status-monitor";
import { AUTOPILOT_POLICY_ID, AUTOPILOT_PROGRAMS, AUTOPILOT_SIGNER_ID, PRIVY_APP_ID, privyWalletRpc } from "@/lib/privy-signer";
import { AUTOPILOT_MEMO, AUTOPILOT_FEE_ATA, AUTOPILOT_MAX_IMPACT_PCT, AUTOPILOT_MAX_PER_RUN, autopilotDecision, autopilotDoneText, vaultTag, vaultFromResult, onlyAllowedPrograms, privyLimitError, PRIVY_LIMIT_ALERT_MS, withFailure, type AutopilotRow } from "@/lib/autopilot";

type Db = { from: (t: string) => any };
type Enrollment = AutopilotRow & { last_result?: string | null; wallet: string; privy_user_id: string; wallet_id: string };

const basic = (secret: string) => ({ Authorization: `Basic ${btoa(`${PRIVY_APP_ID}:${secret}`)}`, "privy-app-id": PRIVY_APP_ID });

/** The caller's own Privy embedded Solana wallet with this address (its Privy wallet id), or null. */
export async function embeddedWalletId(privyUserId: string, address: string, secret: string): Promise<string | null> {
  const res = await fetch(`https://api.privy.io/v1/users/${encodeURIComponent(privyUserId)}`, { headers: basic(secret), signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("No se pudo verificar tu billetera. Inténtalo de nuevo.");
  const body = (await res.json()) as { linked_accounts?: Array<{ type?: string; address?: string; id?: string | null; chain_type?: string; connector_type?: string; wallet_client_type?: string }> };
  const w = (body.linked_accounts ?? []).find((a) => a.type === "wallet" && a.address === address && a.chain_type === "solana" && a.connector_type === "embedded" && (a.wallet_client_type === "privy" || a.wallet_client_type === "privy-v2"));
  return w?.id ?? null;
}

/** True when the Autopilot signer (with its rebalance-only policy) is attached to this Privy wallet. */
export async function hasAutopilotSigner(walletId: string, secret: string): Promise<boolean> {
  const res = await fetch(`https://api.privy.io/v1/wallets/${encodeURIComponent(walletId)}`, { headers: basic(secret), signal: AbortSignal.timeout(8000) });
  if (!res.ok) return false;
  const body = (await res.json()) as { additional_signers?: Array<{ signer_id?: string; override_policy_ids?: string[] }> };
  return (body.additional_signers ?? []).some((s) => s.signer_id === AUTOPILOT_SIGNER_ID && (s.override_policy_ids ?? []).includes(AUTOPILOT_POLICY_ID));
}

/**
 * One Autopilot pass (2-min status cron): for every enabled wallet, re-centre range positions that stayed out of range
 * past AUTOPILOT_WAIT_MS (no cooldown; failures retry after AUTOPILOT_RETRY_MS). The transaction is the same simulated, owner-verified rebalance
 * the user would sign by hand; it is signed by the user's own Privy wallet through the delegated signer, whose Privy
 * policy only allows the rebalance programs. Anything unusual is skipped and the regular alert stays the fallback.
 */
export async function runAutopilot(opts: { db: Db; connection: Connection; rows: Map<string, MonitorRow>; now: number; alert: (privyUserId: string, html: string, button: { text: string; url: string }) => Promise<unknown>; vaultName: (id: string) => string }) {
  const appSecret = process.env["PRIVY_APP_SECRET"], seed = process.env["PRIVY_AUTOPILOT_KEY_SEED"];
  if (!appSecret || !seed) return 0;
  const { db, connection, now } = opts;
  const { data } = await db.from("autopilot_enrollments").select("*").eq("enabled", true).limit(100);
  const list = (data ?? []) as Enrollment[];
  if (!list.length) return 0;
  const { PublicKey, VersionedTransaction } = await import("@solana/web3.js");
  const { readDlmmPositions, simulateDlmmRebalance, dlmmConfig } = await import("@/lib/dlmm.server");
  const { rangeKey } = await import("@/lib/dlmm");
  const iso = new Date(now).toISOString();
  const save = (wallet: string, patch: Record<string, unknown>) => db.from("autopilot_enrollments").update({ ...patch, updated_at: iso }).eq("wallet", wallet);
  const fail = (e: Enrollment, msg: string) => { e.last_result = withFailure(e.last_result, msg); return save(e.wallet, { last_result: e.last_result }); };
  let done = 0;
  for (const e of list) {
    if (done >= AUTOPILOT_MAX_PER_RUN) break;
    // Reconcile: a rebalance sent last cycle that confirmed after we stopped waiting still gets its record and alert.
    const lastSig = (e as { last_signature?: string | null }).last_signature;
    if (lastSig && /Sin confirmación|confirmando/.test(e.last_result ?? "")) {
      const st = (await connection.getSignatureStatuses([lastSig], { searchTransactionHistory: true }).catch(() => null))?.value[0];
      if (st && !st.err && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) {
        const pendingGains = (e as { last_gains_usd?: number | null }).last_gains_usd ?? null;
        const vid = vaultFromResult(e.last_result) ?? "gta6";
        await save(e.wallet, { last_rebalance_at: iso, last_result: "Rebalanceada" + vaultTag(vid) });
        e.last_rebalance_at = iso; e.last_result = "Rebalanceada" + vaultTag(vid);
        await opts.alert(e.privy_user_id, autopilotDoneText(opts.vaultName(vid), undefined, pendingGains != null ? Number(pendingGains) : null), { text: "👀 Ver Mi Billetera", url: "https://bovedamarket.app/wallet" }).catch(() => undefined);
        done++;
        continue;
      }
    }
    const positions = await readDlmmPositions(connection, new PublicKey(e.wallet)).catch(() => null);
    if (!positions) continue;
    for (const p of positions) {
      if (!p.outOfRange || p.locked) continue;
      const k = rangeKey(p.address);
      let since = opts.rows.get(k)?.first_down_at ?? null;
      // Start the out-of-range clock for wallets that do not get Telegram alerts (the range monitor only tracks linked ones).
      if (!since) { since = iso; opts.rows.set(k, { service: k, first_down_at: since, operator_alerted: false, public_alerted: false }); await db.from("system_service_status").upsert({ service: k, first_down_at: since, operator_alerted: false, public_alerted: false, updated_at: iso }, { onConflict: "service" }); continue; }
      if (autopilotDecision(e, since, now) !== "due") continue;
      await save(e.wallet, { last_attempt_at: iso });
      e.last_attempt_at = iso;
      if (!(await hasAutopilotSigner(e.wallet_id, appSecret))) { await save(e.wallet, { enabled: false, last_result: "Permiso retirado: el piloto se apagó." }); break; }
      // Convert verified leftovers (≥ $1, never USDC/SOL/JupUSD) to USDC first; that USDC joins the vault below.
      const { autopilotSweep } = await import("@/lib/autopilot-sweep.server");
            const vaultMint = dlmmConfig(p.vaultId)?.mint ?? "";
      const swept = vaultMint ? await autopilotSweep(connection, { wallet: e.wallet, walletId: e.wallet_id, vaultMint, appSecret, seed }).catch(() => 0n) : 0n;
      const quote = await simulateDlmmRebalance(connection, { wallet: e.wallet, position: p.address, vaultId: p.vaultId as never }, { prepare: true, maxImpactPct: AUTOPILOT_MAX_IMPACT_PCT, memo: AUTOPILOT_MEMO, absorbWalletToken: true, absorbUsdc: swept });
      if (!quote.success || !quote.prepared || quote.prepared.wallet !== e.wallet) { await fail(e, quote.message); continue; }
      const tx = VersionedTransaction.deserialize(Buffer.from(quote.prepared.transaction, "base64"));
      const keys = tx.message.staticAccountKeys.map((k) => k.toBase58());
      const programs = [...new Set(tx.message.compiledInstructions.map((ix) => keys[ix.programIdIndex] ?? ""))];
      // Top-level token instructions may only be the fee: TransferChecked (opcode 12) into the treasury USDC account.
      const tokenIxs = tx.message.compiledInstructions.filter((ix) => keys[ix.programIdIndex] === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
      const feeOnly = tokenIxs.length <= 1 && tokenIxs.every((ix) => ix.data[0] === 12 && keys[ix.accountKeyIndexes[2] ?? -1] === AUTOPILOT_FEE_ATA);
      if (keys[0] !== e.wallet || tx.message.addressTableLookups.length || !feeOnly || !onlyAllowedPrograms(programs, AUTOPILOT_PROGRAMS)) { await fail(e, "Operación fuera de lo permitido; no se firmó."); continue; }
      let signed: string;
      try {
        const out = await privyWalletRpc(e.wallet_id, { method: "signTransaction", chain_type: "solana", params: { transaction: quote.prepared.transaction, encoding: "base64" } }, { appSecret, seed });
        signed = out.data?.signed_transaction ?? "";
        if (!signed) throw new Error("sin firma");
      } catch (err) {
        const msg = (err as Error).message;
        await fail(e, `No se pudo firmar: ${msg}`);
        await privyLimitAlert(db, msg, now).catch(() => undefined);
        continue;
      }
      let signature: string;
      try { signature = await connection.sendRawTransaction(Buffer.from(signed, "base64"), { skipPreflight: false, maxRetries: 3 }); }
      catch { await fail(e, "La red rechazó el envío; se reintentará."); continue; }
      const gains = quote.gainsAddedUsd != null ? Number(quote.gainsAddedUsd) : null;
      // Persist the sent signature before waiting, so a slow confirmation or an interrupted run is reconciled (record + alert) next cycle.
      await save(e.wallet, { last_signature: signature, last_gains_usd: gains, last_result: `${e.last_result?.startsWith("[") ? e.last_result.split("]")[0] + "] " : ""}Enviada; confirmando…${vaultTag(p.vaultId)}` });
      let ok = false;
      for (let i = 0; i < 12 && !ok; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        const st = (await connection.getSignatureStatuses([signature]).catch(() => null))?.value[0];
        if (st?.err) break;
        ok = st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized";
      }
      if (!ok) { await fail(e, "Sin confirmación; se revisará en el próximo ciclo."); continue; }
      await save(e.wallet, { last_rebalance_at: iso, last_signature: signature, last_result: "Rebalanceada" + vaultTag(p.vaultId), last_gains_usd: gains });
      e.last_rebalance_at = iso;
      await db.from("system_service_status").delete().eq("service", k);
      opts.rows.delete(k);
      await opts.alert(e.privy_user_id, autopilotDoneText(opts.vaultName(p.vaultId), quote.valueUsd, gains), { text: "👀 Ver Mi Billetera", url: "https://bovedamarket.app/wallet" }).catch(() => undefined);
      done++;
      break; // one rebalance per wallet per pass
    }
  }
  return done;
}

/** Operator Telegram alert when Privy refuses Autopilot signatures for plan/rate limits; at most once per PRIVY_LIMIT_ALERT_MS. */
async function privyLimitAlert(db: Db, message: string, now: number) {
  const kind = privyLimitError(message);
  if (!kind) return;
  const { data } = await db.from("system_service_status").select("first_down_at").eq("service", "privy_limit").maybeSingle();
  const last = data?.first_down_at ? Date.parse(data.first_down_at) : 0;
  if (now - last < PRIVY_LIMIT_ALERT_MS) return;
  await db.from("system_service_status").upsert({ service: "privy_limit", first_down_at: new Date(now).toISOString(), operator_alerted: true, public_alerted: false, updated_at: new Date(now).toISOString() }, { onConflict: "service" });
  const tg = await import("@/lib/telegram.server");
  await tg.treasuryAlert(kind === "rate"
    ? "🚨 <b>Alerta Privy · Piloto automático</b>\nPrivy rechazó firmas por exceso de peticiones (429). Algunos rebalanceos se reintentarán en 5 min.\nRevisa el plan en dashboard.privy.io."
    : "🚨 <b>Alerta Privy · Piloto automático</b>\nPrivy rechazó firmas por límite del plan (403). Los rebalanceos automáticos están detenidos.\nActiva producción en dashboard.privy.io.");
}
