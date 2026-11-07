import { z } from "zod";
import { solanaAddressSchema } from "@/lib/solana-data";

/** Owner-authorized mainnet pilot: one fixed amount, deposits only. */
export const PILOT_AMOUNT = "1";
export const PILOT_VAULTS = ["sol", "met"] as const;

export const pilotInput = z.object({ wallet: solanaAddressSchema, vaultId: z.enum(PILOT_VAULTS) }).strict();
export const signatureInput = z.object({ signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/) }).strict();

export type PreparedPilot = { transaction: string; lastValidBlockHeight: number; position: string };
export type PilotStatus = "pending" | "confirmed" | "finalized" | "failed";
