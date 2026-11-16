import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WITHDRAWAL_PILOT } from "@/lib/withdrawal";

const mocks = vi.hoisted(() => ({ positions: [] as object[] }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: unknown }) => children, useRouter: () => null }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/hooks/use-boveda-session", async (orig) => ({ ...(await orig<object>()), useBovedaSession: () => ({ authenticated: true, ready: true, login: vi.fn() }) }));
vi.mock("@/lib/coinbase-offramp.functions", () => ({ startCoinbaseBuy: vi.fn(), coinbaseOnrampStatus: vi.fn(), recordCoinbaseOnramp: vi.fn(), startCoinbaseSell: vi.fn(), coinbaseSellStatus: vi.fn() }));
vi.mock("@/components/open-predictions", () => ({ WalletOpenPredictions: () => null, OpenPredictions: () => null, useOpenPredictions: () => ({ items: [] }) }));
vi.mock("@/components/pending-claims", () => ({ PendingClaims: () => null }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: { success: true, data: { positions: mocks.positions, positionsComplete: true, usdc: "10", sol: "1", checkedAt: new Date().toISOString() } }, refetch: vi.fn() }), useQueryClient: () => ({ getQueryData: () => undefined, invalidateQueries: vi.fn() }), useQueries: ({ queries }: { queries: unknown[] }) => queries.map(() => ({ data: undefined })) }));
vi.mock("@/lib/solana.functions", () => ({ getRealWallet: vi.fn() }));
vi.mock("@/lib/autopilot.functions", () => ({ autopilotStatus: vi.fn(), enableAutopilot: vi.fn(), disableAutopilot: vi.fn() }));
vi.mock("@/lib/migrate-policy.functions", () => ({ getMigratePolicy: vi.fn(async () => ({ enabled: false })), setMigratePolicy: vi.fn() }));
vi.mock("@/components/deposit-simulation", () => ({ DepositSimulation: () => null }));
vi.mock("@/components/withdrawal-simulation", () => ({ WithdrawalSimulation: () => <p>Revisión de cierre autorizada</p> }));
vi.mock("@/components/harvest-dialog", () => ({ HarvestDialog: ({ compound }: { compound?: boolean }) => <p>{compound ? "Revisión de reinversión autorizada" : "Revisión de cosecha autorizada"}</p> }));
vi.mock("@/components/pool-yield", () => ({ PoolYield: () => null }));
vi.mock("@/components/buy-usdc", () => ({ BuyUsdc: () => null }));
vi.mock("@/components/real-portfolio-panel", () => ({ RealPortfolioPanel: () => null }));
vi.mock("@/components/portfolio-summary", () => ({ PortfolioSummary: () => null }));
vi.mock("@/components/rebalance-button", () => ({ RebalanceButton: () => null }));
import { RealOverview } from "@/components/real-overview";

afterEach(cleanup);
function show(address: string, locked = false) {
  mocks.positions = [{ address, vaultId: "sol", symbol: "SOL", tokenAmount: "1", usdcAmount: "1", feeTokenAmount: "0", feeUsdcAmount: "0", locked }];
  render(<RealOverview portfolioOnly walletAddress={WITHDRAWAL_PILOT.wallet} onDetails={vi.fn()} />);
}

it("opens harvest review for the exact authorized pilot", () => {
  show(WITHDRAWAL_PILOT.position);
  fireEvent.click(screen.getByRole("button", { name: "Cosechar Ganancias" }));
  expect(screen.getByText("Revisión de cosecha autorizada")).toBeInTheDocument();
});
it("opens close review for the exact unlocked authorized pilot", () => {
  show(WITHDRAWAL_PILOT.position);
  fireEvent.click(screen.getByRole("button", { name: "Retirar" }));
  expect(screen.getByText("Revisión de cierre autorizada")).toBeInTheDocument();
});
it.each(["Cosechar Ganancias", "Retirar"])("opens %s review for new owner positions", (name) => {
  show("new-position");
  expect(screen.getByRole("button", { name })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name }));
  expect(screen.getByText(name === "Cosechar Ganancias" ? "Revisión de cosecha autorizada" : "Revisión de cierre autorizada")).toBeInTheDocument();
});
it("does not authorize closing locked pilot liquidity", () => {
  show(WITHDRAWAL_PILOT.position, true);
  fireEvent.click(screen.getByRole("button", { name: "Retirar" }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.queryByText("Revisión de cierre autorizada")).not.toBeInTheDocument();
});it("opens the two-step reinvest flow from Reinvertir ganancias", () => {
  show("new-position");
  fireEvent.click(screen.getByRole("button", { name: "Reinvertir" }));
  expect(screen.getByText("Revisión de reinversión autorizada")).toBeInTheDocument();
});

