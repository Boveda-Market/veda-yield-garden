import { useServerFn } from "@tanstack/react-start";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { REF_STORAGE_KEY, normalizeCode } from "@/lib/affiliate";
import { joinAffiliate, recordAffiliateFee, verifyWalletOwnership, walletIsVerified } from "@/lib/affiliate.functions";
import { walletProofMessage } from "@/lib/wallet-proof";

/**
 * Right after a confirmed deposit/harvest/exit, credits the referrer automatically from the on-chain fee.
 * The first time, the wallet signs a free text message proving it belongs to this account. Never blocks the user.
 */
export function useAffiliateReport() {
  const session = useBovedaSession();
  const join = useServerFn(joinAffiliate);
  const record = useServerFn(recordAffiliateFee);
  const isVerified = useServerFn(walletIsVerified);
  const verify = useServerFn(verifyWalletOwnership);
  return async (signature: string, kind: "harvest" | "exit" | "deposit") => {
    try {
      const token = await session.getAccessToken?.();
      const wallet = session.walletAddress;
      if (!token || !wallet || !session.userId) return;
      const stored = normalizeCode(localStorage.getItem(REF_STORAGE_KEY));
      if (stored) { await join({ data: { token, code: stored } }).catch(() => null); localStorage.removeItem(REF_STORAGE_KEY); }
      const { verified } = await isVerified({ data: { token, wallet } });
      if (!verified && session.signMessage) {
        const issuedAt = new Date().toISOString();
        const proof = await session.signMessage(walletProofMessage(session.userId, wallet, issuedAt));
        await verify({ data: { token, wallet, issuedAt, signature: proof } });
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        const { success } = await record({ data: { token, signature, kind } });
        if (success) return;
        await new Promise((r) => setTimeout(r, 2000)); // indexer may lag a second behind confirmation
      }
    } catch { /* affiliate credit is best-effort */ }
  };
}
