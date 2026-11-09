import { useServerFn } from "@tanstack/react-start";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { REF_STORAGE_KEY, normalizeCode } from "@/lib/affiliate";
import { joinAffiliate, recordAffiliateFee } from "@/lib/affiliate.functions";

/** After a confirmed harvest/exit, lets the server credit the referrer from the on-chain fee. Never blocks the user. */
export function useAffiliateReport() {
  const session = useBovedaSession();
  const join = useServerFn(joinAffiliate);
  const record = useServerFn(recordAffiliateFee);
  return async (signature: string, kind: "harvest" | "exit") => {
    try {
      const token = await session.getAccessToken?.();
      if (!token) return;
      const stored = normalizeCode(localStorage.getItem(REF_STORAGE_KEY));
      if (stored) { await join({ data: { token, code: stored } }).catch(() => null); localStorage.removeItem(REF_STORAGE_KEY); }
      await record({ data: { token, signature, kind } });
    } catch { /* affiliate credit is best-effort */ }
  };
}
