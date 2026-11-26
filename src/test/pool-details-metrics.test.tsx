import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PoolDetails } from "@/components/pool-details";
import { VAULTS } from "@/lib/vaults";

const POOL = "3C5YE97HADPDxZehYq9Cis8AXr9aNyrUsczKzE1nDbW9";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

/** DexScreener + Meteora responses where the 24 h and last-hour figures are deliberately different. */
function mountDetails() {
  const vault = VAULTS.find((v) => v.id === "trump")!;
  const fetcher = vi.fn(async (url: string) => {
    if (url.includes("api.dexscreener.com/latest/dex/pairs")) {
      return { ok: true, json: async () => ({
        pairs: [{
          chainId: "solana", pairAddress: POOL,
          baseToken: { symbol: "TRUMP", address: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN" },
          quoteToken: { symbol: "USDC" },
          priceUsd: "2.5", marketCap: 1_000_000_000,
          volume: { h24: 1_234_567, h1: 49_448 },
          liquidity: { usd: 3_000_000, base: 2_986_914, quote: 1_203_085 },
          priceChange: { m5: -0.4, h1: 1.83, h6: -0.5, h24: 3 },
          txns: { h24: { buys: 600, sells: 400 }, h1: { buys: 130, sells: 66 } },
        }],
      }) };
    }
    if (url.includes("datapi.meteora.ag")) {
      return { ok: true, json: async () => ({
        address: POOL, tvl: 3_000_000,
        fees: { "24h": 1_500, "1h": 60 },
        volume: { "24h": 1_234_567, "1h": 49_448 },
        cumulative_metrics: { volume: 90_000_000, fees: 400_000 },
        token_x: { holders: 40_000, symbol: "TRUMP", is_verified: true, freeze_authority_disabled: false, total_supply: 1_000_000_000, market_cap: 1_000_000_000 },
        token_y: { symbol: "USDC" },
        token_x_amount: 2_986_914, token_y_amount: 1_203_085,
        pool_config: { base_fee_pct: 0.04, protocol_fee_pct: 5 },
        created_at: Date.now() - 200 * 86_400_000,
      }) };
    }
    return { ok: true, json: async () => ({}) };
  });
  vi.stubGlobal("fetch", fetcher);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><PoolDetails vault={vault} onClose={() => {}} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("tab", { name: "Estadísticas del Pool" }));
  return fetcher;
}

describe("pool activity metrics", () => {
  it("shows volume and trades of the last 24 hours instead of the last hour", async () => {
    mountDetails();
    await waitFor(() => expect(screen.getByText("$1.2M")).toBeInTheDocument(), { timeout: 4000 });
    expect(screen.getByText("Volumen · 24 h")).toBeInTheDocument();
    expect(screen.getByText("Intercambios · 24 h")).toBeInTheDocument();
    // The 24 h trade count (600 buys + 400 sells), not the last-hour one (130 + 66 = 196).
    expect(screen.getByText("1,000")).toBeInTheDocument();
    expect(screen.queryByText("196")).not.toBeInTheDocument();
    // No last-hour tiles left anywhere in the dialog, and the 24 h volume replaced the 1 h one.
    expect(screen.queryByText(/última hora/)).not.toBeInTheDocument();
    expect(screen.queryByText("$49,448")).not.toBeInTheDocument();
    expect(screen.getByText("60% compras")).toBeInTheDocument();
  });
});
