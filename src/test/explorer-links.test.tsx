import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WITHDRAWAL_PILOT } from "@/lib/withdrawal";

// The explorer reference must stay in plain sight: on the position card next to the
// «Powered by Meteora» badge (not hidden inside «Ver detalles»), and as public addresses
// in the guide for people who bring their own coins.
const mocks = vi.hoisted(() => ({ positions: [] as object[] }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: import("react").ReactNode; to?: string }) => <a href={to}>{children}</a>,
  useRouter: () => null,
  createFileRoute: () => (opts: unknown) => opts,
}));
vi.mock("@tanstack/react-start", async (orig) => ({ ...(await orig<object>()), useServerFn: (fn: unknown) => fn }));
vi.mock("@/hooks/use-boveda-session", async (orig) => ({ ...(await orig<object>()), useBovedaSession: () => ({ authenticated: true, ready: true, login: vi.fn() }) }));
vi.mock("@/lib/coinbase-offramp.functions", () => ({ startCoinbaseBuy: vi.fn(), coinbaseOnrampStatus: vi.fn(), recordCoinbaseOnramp: vi.fn(), startCoinbaseSell: vi.fn(), coinbaseSellStatus: vi.fn() }));
vi.mock("@/components/open-predictions", () => ({ WalletOpenPredictions: () => null, OpenPredictions: () => null, useOpenPredictions: () => ({ items: [] }) }));
vi.mock("@/components/pending-claims", () => ({ PendingClaims: () => null }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: { success: true, data: { positions: mocks.positions, positionsComplete: true, usdc: "10", sol: "1", checkedAt: new Date().toISOString() } }, refetch: vi.fn() }), useQueryClient: () => ({ getQueryData: () => undefined, invalidateQueries: vi.fn() }), useQueries: ({ queries }: { queries: unknown[] }) => queries.map(() => ({ data: undefined })) }));
vi.mock("@/lib/solana.functions", () => ({ getRealWallet: vi.fn() }));
vi.mock("@/lib/autopilot.functions", () => ({ autopilotStatus: vi.fn(), enableAutopilot: vi.fn(), disableAutopilot: vi.fn() }));
vi.mock("@/lib/migrate-policy.functions", () => ({ getMigratePolicy: vi.fn(async () => ({ enabled: false })), setMigratePolicy: vi.fn() }));
vi.mock("@/components/deposit-simulation", () => ({ DepositSimulation: () => null }));
vi.mock("@/components/withdrawal-simulation", () => ({ WithdrawalSimulation: () => null }));
vi.mock("@/components/harvest-dialog", () => ({ HarvestDialog: () => null }));
vi.mock("@/components/pool-yield", () => ({ PoolYield: () => null }));
vi.mock("@/components/buy-usdc", () => ({ BuyUsdc: () => null }));
vi.mock("@/components/real-portfolio-panel", () => ({ RealPortfolioPanel: () => null }));
vi.mock("@/components/portfolio-summary", () => ({ PortfolioSummary: () => null }));
vi.mock("@/components/rebalance-button", () => ({ RebalanceButton: () => null }));

import { RealOverview } from "@/components/real-overview";
import { Page as BringCoinsGuide } from "@/routes/guias/trae-tus-monedas";
import { CHAIN_POOLS, USDC_MINT } from "@/lib/solana-data";

const POSITION = { address: "p1", vaultId: "sol", symbol: "SOL", tokenAmount: "1", usdcAmount: "1", feeTokenAmount: "0", feeUsdcAmount: "0", locked: false };

afterEach(cleanup);

function openCard() {
  mocks.positions = [POSITION];
  render(<RealOverview portfolioOnly walletAddress={WITHDRAWAL_PILOT.wallet} onDetails={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Ver más/ }));
  return within(screen.getByRole("dialog"));
}

it("shows the explorer link on the open position card without unfolding anything", () => {
  const card = openCard();
  const link = card.getByRole("link", { name: "Ver en el explorador" });
  expect(link).toHaveAttribute("href", "https://solscan.io/account/p1");
  // Plain sight: it must live outside the folded «Ver detalles» block.
  expect(link.closest("details")).toBeNull();
  expect(card.getAllByRole("link", { name: "Ver en el explorador" })).toHaveLength(1);
});

it("drops the orphan copy-address button from the folded details", () => {
  const card = openCard();
  expect(card.queryByRole("button", { name: "Copiar identificador" })).toBeNull();
});

it("keeps the guides link out of the folded details", () => {
  const card = openCard();
  expect(card.queryByRole("link", { name: /Guías/ })).toBeNull();
});

it("lists every coin and vault address in the bring-your-own-coins guide", () => {
  render(<BringCoinsGuide />);
  const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href") ?? "");
  const coins = hrefs.filter((h) => h.startsWith("https://solscan.io/token/"));
  const pools = hrefs.filter((h) => h.startsWith("https://solscan.io/account/"));
  // Every chain pool plus USDC, each once; every pool address, each once.
  expect(coins).toHaveLength(CHAIN_POOLS.length + 1);
  expect(pools).toHaveLength(CHAIN_POOLS.length);
  for (const p of CHAIN_POOLS) {
    expect(coins).toContain(`https://solscan.io/token/${p.mint}`);
    expect(pools).toContain(`https://solscan.io/account/${p.pool}`);
  }
  expect(coins).toContain(`https://solscan.io/token/${USDC_MINT}`);
  expect(new Set(coins).size).toBe(coins.length);
  expect(new Set(pools).size).toBe(pools.length);
});
