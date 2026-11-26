import { it, expect, vi } from "vitest";
vi.mock("@/lib/wallet-chain.functions", () => ({ getTxContext: async () => ({ success: true, data: { blockhash: "11111111111111111111111111111111", tables: [] } }) }));
const extraTransfer = vi.hoisted(() => vi.fn(async () => ({ success: true, transaction: [1, 2, 3] })));
vi.mock("@/lib/token-transfer.functions", () => ({ prepareTokenTransfer: extraTransfer }));
import { buildTransfer } from "@/lib/wallet-actions";
it("builds usdc transfer with fee", async () => {
  const b = await buildTransfer({ from: "7eAb9SwyxdZj6jr88pMAnGAG41iPgMNa67xGT377zFT7", to: "GZ3wFmrMdXJAigwooa8GTginE6tLeTzgGLbXhgYTp7HR", asset: "USDC", amount: 3000000n, fee: 30000n });
  expect(b.length).toBeGreaterThan(200);
});
it("routes extra coin sends through the authenticated, simulated builder with exact units", async () => {
  const b = await buildTransfer({ from: "7eAb9SwyxdZj6jr88pMAnGAG41iPgMNa67xGT377zFT7", to: "GZ3wFmrMdXJAigwooa8GTginE6tLeTzgGLbXhgYTp7HR", asset: "DCTY", amount: 1_000_001n });
  expect(extraTransfer).toHaveBeenCalledWith({ data: { from: "7eAb9SwyxdZj6jr88pMAnGAG41iPgMNa67xGT377zFT7", to: "GZ3wFmrMdXJAigwooa8GTginE6tLeTzgGLbXhgYTp7HR", asset: "DCTY", amount: "1000001" } });
  expect(Array.from(b)).toEqual([1, 2, 3]);
});
