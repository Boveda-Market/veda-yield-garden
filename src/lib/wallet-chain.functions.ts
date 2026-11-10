import { createServerFn } from "@tanstack/react-start";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { z } from "zod";
import { solanaAddressSchema } from "@/lib/solana-data";
import { SWAP_TOKENS } from "@/lib/wallet-actions";

// Narrow public-chain reads for building wallet transactions in the browser.
// The public RPC rejects browser origins, so these go through the private provider.
// No signing, sending or arbitrary RPC forwarding happens here.

const contextInput = z.object({ lookupTables: z.array(solanaAddressSchema).max(8) }).strict();
export type ChainContext = { blockhash: string; tables: { key: string; addresses: string[] }[] };

export const getTxContext = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => contextInput.parse(input))
  .handler(async ({ data }): Promise<{ success: true; data: ChainContext } | { success: false; error: string }> => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) return { success: false, error: "La conexión todavía no está configurada." };
    try {
      const { PublicKey } = await import("@solana/web3.js");
      const { heliusConnection } = await import("@/lib/helius.server");
      const connection = heliusConnection(key);
      const [{ blockhash }, tables] = await Promise.all([
        connection.getLatestBlockhash("confirmed"),
        Promise.all(data.lookupTables.map((a) => connection.getAddressLookupTable(new PublicKey(a)))),
      ]);
      return { success: true, data: { blockhash, tables: tables.flatMap((r) => r.value ? [{ key: r.value.key.toBase58(), addresses: r.value.state.addresses.map((x) => x.toBase58()) }] : []) } };
    } catch {
      return { success: false, error: "No se pudo preparar la operación. Inténtalo de nuevo; no se ha movido dinero." };
    }
  });

const SWAP_MINTS = SWAP_TOKENS.map((t) => t.mint);
const balanceInput = z.object({ wallet: solanaAddressSchema, mint: z.string().refine((m) => SWAP_MINTS.includes(m)) }).strict();

export const getTokenBalance = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => balanceInput.parse(input))
  .handler(async ({ data }): Promise<{ success: true; amount: string } | { success: false; error: string }> => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) return { success: false, error: "La conexión todavía no está configurada." };
    try {
      const { PublicKey } = await import("@solana/web3.js");
      const { heliusConnection } = await import("@/lib/helius.server");
      const res = await heliusConnection(key).getParsedTokenAccountsByOwner(new PublicKey(data.wallet), { mint: new PublicKey(data.mint) }, "confirmed");
      let total = 0n;
      for (const v of res.value) {
        const info = (v.account.data as { parsed?: { info?: { mint?: string; owner?: string; tokenAmount?: { amount?: string } } } }).parsed?.info;
        if (info?.mint === data.mint && info.owner === data.wallet && /^\d+$/.test(info.tokenAmount?.amount ?? "")) total += BigInt(info.tokenAmount!.amount!);
      }
      return { success: true, amount: total.toString() };
    } catch {
      return { success: false, error: "No se pudo leer el saldo." };
    }
  });
