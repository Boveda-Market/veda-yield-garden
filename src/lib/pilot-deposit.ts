import { z } from "zod";
import { solanaAddressSchema } from "@/lib/solana-data";
import { depositAmountSchema } from "@/lib/deposit-simulation";

/** Mainnet deposits within the validated amount range; exit authorization is separate. */
export const PILOT_VAULTS = ["sol", "met", "gta6", "dcty", "trump", "btc"] as const;

export const pilotInput = z.object({ wallet: solanaAddressSchema, vaultId: z.enum(PILOT_VAULTS), amount: depositAmountSchema, position: solanaAddressSchema.optional(), migrate: z.literal(true).optional() }).strict();
export const signatureInput = z.object({ signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/) }).strict();

export type PreparedPilot = { transaction: string; lastValidBlockHeight: number; position: string };
export type PilotStatus = "pending" | "confirmed" | "finalized" | "failed";
