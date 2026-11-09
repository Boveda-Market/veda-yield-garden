import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WITHDRAWAL_PILOT } from "@/lib/withdrawal";

const mocks = vi.hoisted(() => ({ positions: [] as object[] }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: unknown }) => children }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: { success: true, data: { positions: mocks.positions, positionsComplete: true, usdc: "10", sol: "1", checkedAt: new Date().toISOString() } }, refetch: vi.fn() }), useQueries: ({ queries }: { queries: unknown[] }) => queries.map(() => ({ data: undefined })) }));
vi.mock("@/lib/solana.functions", () => ({ getRealWallet: vi.fn() }));
vi.mock("@/components/deposit-simulation", () => ({ DepositSimulation: () => null }));
vi.mock("@/components/withdrawal-simulation", () => ({ WithdrawalSimulation: () => <p>Revisión de cierre autorizada</p> }));
vi.mock("@/components/harvest-dialog", () => ({ HarvestDialog: ({ compound }: { compound?: boolean }) => <p>{compound ? "Revisión de reinversión autorizada" : "Revisión de cosecha autorizada"}</p> }));
vi.mock("@/components/pool-yield", () => ({ PoolYield: () => null }));
vi.mock("@/components/buy-usdc", () => ({ BuyUsdc: () => null }));
vi.mock("@/components/real-portfolio-panel", () => ({ RealPortfolioPanel: () => null }));
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
  fireEvent.click(screen.getByRole("button", { name: "Cerrar y Liquidar" }));
  expect(screen.getByText("Revisión de cierre autorizada")).toBeInTheDocument();
});
it.each(["Cosechar Ganancias", "Cerrar y Liquidar"])("opens %s review for new owner positions", (name) => {
  show("new-position");
  expect(screen.getByRole("button", { name })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name }));
  expect(screen.getByText(name === "Cosechar Ganancias" ? "Revisión de cosecha autorizada" : "Revisión de cierre autorizada")).toBeInTheDocument();
});
it("does not authorize closing locked pilot liquidity", () => {
  show(WITHDRAWAL_PILOT.position, true);
  fireEvent.click(screen.getByRole("button", { name: "Cerrar y Liquidar" }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.queryByText("Revisión de cierre autorizada")).not.toBeInTheDocument();
});it("opens the two-step reinvest flow from Reinvertir ganancias", () => {
  show("new-position");
  fireEvent.click(screen.getByRole("button", { name: "Reinvertir ganancias" }));
  expect(screen.getByText("Revisión de reinversión autorizada")).toBeInTheDocument();
});
