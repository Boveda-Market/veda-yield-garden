// TEMPORARY local test route — must be deleted before commit.
import { createFileRoute } from "@tanstack/react-router";

type B = { op: string; wallet: string; position?: string; vaultId?: string; percent?: number; amount?: string; target?: "standard" | "vault"; marketId?: string; isYes?: boolean; signed?: string; context?: string; order?: string; usdcRaw?: string; tokenRaw?: string };
const norm = (r: Record<string, unknown>) => { const p = r["prepared"] as { transaction?: string } | undefined; const { prepared: _p, transaction, ...rest } = r; return { ...rest, tx: p?.transaction ?? transaction }; };

export const Route = createFileRoute("/api/public/jobs/debug-live")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("authorization") !== `Bearer ${process.env["LOVABLE_CRON_SECRET"]}`) return new Response("no", { status: 401 });
        const b = (await request.json()) as B;
        const key = process.env["HELIUS_API_KEY"]!;
        try {
          if (b.op === "read") { const { readRealWallet } = await import("@/lib/solana-read.server"); return Response.json(await readRealWallet(key, b.wallet)); }
          if (b.op === "withdraw") { const { simulateWithdrawal } = await import("@/lib/withdrawal.server"); const inp = { wallet: b.wallet, position: b.position!, vaultId: b.vaultId!, percent: b.percent } as never; const q = await simulateWithdrawal(key, inp) as { success: boolean; feeRaw?: string; minimumNetRaw?: string }; if (!q.success) return Response.json(q); return Response.json(norm(await simulateWithdrawal(key, inp, { prepare: true, maximumFeeRaw: q.feeRaw!, minimumNetRaw: q.minimumNetRaw! } as never) as never)); }
          if (b.op === "harvest") { const { simulateHarvest } = await import("@/lib/harvest.server"); const inp = { wallet: b.wallet, position: b.position!, vaultId: b.vaultId! } as never; const q = await simulateHarvest(key, inp) as { success: boolean; feeRaw?: string }; if (!q.success) return Response.json(q); return Response.json(norm(await simulateHarvest(key, inp, { prepare: true, maximumFeeRaw: q.feeRaw! }) as never)); }
          if (b.op === "deposit") { const { simulateDeposit } = await import("@/lib/deposit-simulation.server"); return Response.json(norm(await simulateDeposit(key, { wallet: b.wallet, vaultId: b.vaultId!, amount: b.amount! } as never, { preparePilot: true }) as never)); }
          if (b.op === "rebalance") { const { simulateDlmmRebalance } = await import("@/lib/dlmm.server"); const { heliusConnection } = await import("@/lib/helius.server"); return Response.json(norm(await simulateDlmmRebalance(heliusConnection(key), { wallet: b.wallet, position: b.position!, vaultId: b.vaultId! } as never, { prepare: true }) as never)); }
          if (b.op === "compound") { const { prepareCompound } = await import("@/lib/compound.server"); return Response.json(norm(await prepareCompound(key, { wallet: b.wallet, position: b.position!, vaultId: b.vaultId!, usdcRaw: b.usdcRaw!, tokenRaw: b.tokenRaw! } as never) as never)); }
          if (b.op === "refill") {
            const { PublicKey } = await import("@solana/web3.js"); const { heliusConnection } = await import("@/lib/solana-read.server"); const { refillLamports, refillCharge } = await import("@/lib/gas-refill");
            const sol = BigInt(await heliusConnection(key).getBalance(new PublicKey(b.wallet), "confirmed")); const lamports = refillLamports(sol, b.target ?? "standard");
            if (lamports <= 0n) return Response.json({ success: false, error: "Tu reserva para operaciones ya está bien.", sol: sol.toString() });
            const q = await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=${lamports}&slippageBps=50`);
            const charge = refillCharge(BigInt(((await q.json()) as { outAmount: string }).outAmount)); const { FEE_WALLET } = await import("@/lib/fees"); const { buildGasRefill } = await import("@/lib/affiliate.server");
            return Response.json({ success: true, tx: await buildGasRefill(key, process.env["AFFILIATE_PAYOUT_SECRET_KEY"]!, FEE_WALLET, b.wallet, lamports, charge), lamports: lamports.toString(), chargeMicro: charge.toString(), before: sol.toString() });
          }
          const P = await import("@/lib/predict.server");
          if (b.op === "rounds") return Response.json((await P.listRounds()).map((r) => ({ ...r })));
          if (b.op === "pbuy") return Response.json(norm({ success: true, ...(await P.buildBuy(key, { wallet: b.wallet, marketId: b.marketId!, isYes: b.isYes!, amount: BigInt(b.amount!) })) } as never));
          if (b.op === "psell") return Response.json(norm({ success: true, ...(await P.buildSell(key, { wallet: b.wallet, position: b.position! })) } as never));
          if (b.op === "pclaim") return Response.json(norm({ success: true, ...(await P.buildClaim(key, { wallet: b.wallet, position: b.position! })) } as never));
          if (b.op === "pexec") return Response.json({ signature: await P.execute(b.wallet, b.signed!, b.context!) });
          if (b.op === "pstatus") return Response.json({ state: await P.orderStatus(b.order!) });
          if (b.op === "ppos") return Response.json(await P.listPositions(b.wallet));
          if (b.op === "prefunds") return Response.json(await P.listRefunds(b.wallet));
          return new Response("op?", { status: 400 });
        } catch (e) { return Response.json({ error: String((e as Error)?.message ?? e) }); }
      },
    },
  },
});
