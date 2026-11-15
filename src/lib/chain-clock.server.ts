import BN from "bn.js";
import { Buffer } from "buffer";
import { SYSVAR_CLOCK_PUBKEY, type Connection } from "@solana/web3.js";

/**
 * Current activation point (slot or unix time) read from the on-chain Clock sysvar,
 * the same value the program checks. The SDK helper calls getBlockTime on the newest
 * slot, which RPCs often have not indexed yet ("Block not available for slot"), making
 * partial withdrawals fail at random.
 */
export async function currentActivationPoint(connection: Connection, activationType: number): Promise<BN> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const info = await connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY, "confirmed").catch(() => null);
    if (info && info.data.length >= 40) {
      const data = Buffer.from(info.data);
      return activationType === 0 ? new BN(data.readBigUInt64LE(0).toString()) : new BN(data.readBigInt64LE(32).toString());
    }
    await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
  }
  throw new Error("Reloj de la red no disponible");
}
