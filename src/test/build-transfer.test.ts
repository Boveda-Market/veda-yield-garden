import { it, expect, vi } from "vitest";
vi.mock("@/lib/wallet-chain.functions", () => ({ getTxContext: async () => ({ success: true, data: { blockhash: "11111111111111111111111111111111", tables: [] } }) }));
import { buildTransfer } from "@/lib/wallet-actions";
it("builds usdc transfer with fee", async () => {
  const b = await buildTransfer({ from: "7eAb9SwyxdZj6jr88pMAnGAG41iPgMNa67xGT377zFT7", to: "GZ3wFmrMdXJAigwooa8GTginE6tLeTzgGLbXhgYTp7HR", asset: "USDC", amount: 3000000n, fee: 30000n });
  expect(b.length).toBeGreaterThan(200);
});
