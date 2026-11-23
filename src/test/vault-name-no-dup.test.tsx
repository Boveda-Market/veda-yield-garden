import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WITHDRAWAL_PILOT } from "@/lib/withdrawal";

// Vault names already carry the token (GTA6, DCTY, Bóveda SOL), so no card may repeat the
// token: not as a "GTA6/USDC" pair line, and not as an icon that falls back to the letters.
const mocks = vi.hoisted(() => ({ positions: [] as object[] }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: unknown }) => children, useRouter: () => null }));
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

const POSITION = { address: "p1", vaultId: "sol", symbol: "SOL", tokenAmount: "1", usdcAmount: "1", feeTokenAmount: "0", feeUsdcAmount: "0", locked: false };
const PAIRS = ["SOL/USDC", "GTA6/USDC", "DCTY/USDC", "MET/USDC"];

afterEach(cleanup);

it("shows only each vault's name in the Bóvedas grid", () => {
  mocks.positions = [POSITION];
  render(<RealOverview walletAddress={WITHDRAWAL_PILOT.wallet} onDetails={vi.fn()} />);
  const grid = screen.getByLabelText("Bóvedas disponibles");
  for (const pair of PAIRS) expect(within(grid).queryByText(pair)).toBeNull();
  expect(within(grid).queryByText(/APR/)).toBeNull();
  expect(within(grid).queryByText("Alto riesgo")).toBeNull();
  expect(within(grid).queryByText("Riesgo medio")).toBeNull();
  expect(within(grid).queryByText("Tienes capital")).toBeNull();
  // GTA6 and DCTY have no bundled logo: their icon must not fall back to the same letters.
  expect(within(grid).getAllByText("GTA6")).toHaveLength(1);
  expect(within(grid).getAllByText("DCTY")).toHaveLength(1);
});

it("keeps the full card free of a repeated token when a bóveda is opened", () => {
  mocks.positions = [POSITION];
  render(<RealOverview walletAddress={WITHDRAWAL_PILOT.wallet} onDetails={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /GTA6/ }));
  const card = within(screen.getByRole("dialog"));
  expect(card.queryByText("GTA6/USDC")).toBeNull();
  expect(card.getByText("Alto riesgo")).toBeInTheDocument();
});

it("keeps an open position card free of a repeated token", () => {
  mocks.positions = [POSITION];
  render(<RealOverview portfolioOnly walletAddress={WITHDRAWAL_PILOT.wallet} onDetails={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Ver más/ }));
  const card = within(screen.getByRole("dialog"));
  expect(card.queryByText("SOL/USDC")).toBeNull();
  expect(card.getByText("Activa")).toBeInTheDocument();
});

it("opens the active portfolio card with pool details when tapping a vault that has money", () => {
  mocks.positions = [POSITION];
  const onDetails = vi.fn();
  render(<RealOverview walletAddress={WITHDRAWAL_PILOT.wallet} onDetails={onDetails} />);
  fireEvent.click(screen.getByRole("button", { name: /SOL/ }));
  const card = within(screen.getByRole("dialog"));
  expect(card.getByText("Valor estimado")).toBeInTheDocument();
  expect(card.queryByText(/Cosechar y reinvertir se activan/)).toBeNull();
  fireEvent.click(card.getByText("Ver detalles"));
  fireEvent.click(card.getByRole("button", { name: /Detalles de la bóveda/ }));
  expect(onDetails).toHaveBeenCalledWith(expect.objectContaining({ id: "sol" }));
});
