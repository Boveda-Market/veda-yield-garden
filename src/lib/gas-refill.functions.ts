import { createServerFn } from "@tanstack/react-start";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { gasRefillInput, refillCharge, refillLamports } from "@/lib/gas-refill";

type Fail = { success: false; error: string };

/** Prepares a one-tap network-reserve refill paid in USDC; the treasury pays the network fee so it works even at zero SOL. */
export const prepareGasRefill = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((d: unknown) => gasRefillInput.parse(d))
  .handler(async ({ data }): Promise<{ success: true; transaction: string; lamports: string; chargeMicro: string } | Fail> => {
    const key = process.env["HELIUS_API_KEY"];
    const secret = process.env["AFFILIATE_PAYOUT_SECRET_KEY"];
    if (!key || !secret) return { success: false, error: "La recarga de reserva no está disponible ahora. Usa Cambiar de USDC a SOL." };
    try {
      const { PublicKey } = await import("@solana/web3.js");
      const { heliusConnection } = await import("@/lib/solana-read.server");
      const sol = BigInt(await heliusConnection(key).getBalance(new PublicKey(data.wallet), "confirmed"));
      const lamports = refillLamports(sol);
      if (lamports <= 0n) return { success: false, error: "Tu reserva para costos de red ya está bien." };
      const SOL = "So11111111111111111111111111111111111111112", USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
      const q = await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=${SOL}&outputMint=${USDC}&amount=${lamports}&slippageBps=50`);
      if (!q.ok) throw new Error("quote");
      const market = BigInt(((await q.json()) as { outAmount: string }).outAmount);
      const charge = refillCharge(market);
      const { FEE_WALLET } = await import("@/lib/fees");
      const { buildGasRefill } = await import("@/lib/affiliate.server");
      const transaction = await buildGasRefill(key, secret, FEE_WALLET, data.wallet, lamports, charge);
      return { success: true, transaction, lamports: lamports.toString(), chargeMicro: charge.toString() };
    } catch (e) {
      console.error("gas refill failed", e instanceof Error ? e.message : "unknown");
      return { success: false, error: "No se pudo preparar la recarga. Revisa que tengas suficientes USDC e inténtalo de nuevo." };
    }
  });
