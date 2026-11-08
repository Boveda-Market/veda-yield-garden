import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WITHDRAWAL_PILOT } from "@/lib/withdrawal";

const mocks = vi.hoisted(() => ({ positions: [] as object[] }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: { success: true, data: { positions: mocks.positions, positionsComplete: true, usdc: "10", sol: "1", checkedAt: new Date().toISOString() } }, refetch: vi.fn() }) }));
vi.mock("@/lib/solana.functions", () => ({ getRealWallet: vi.fn() }));
vi.mock("@/components/deposit-simulation", () => ({ DepositSimulation: () => null }));
vi.mock("@/components/withdrawal-simulation", () => ({ WithdrawalSimulation: () => <p>Revisión de cierre autorizada</p> }));
vi.mock("@/components/harvest-dialog", () => ({ HarvestDialog: () => <p>Revisión de cosecha autorizada</p> }));
vi.mock("@/components/pool-yield", () => ({ PoolYield: () => null }));
vi.mock("@/components/buy-usdc", () => ({ BuyUsdc: () => null }));
import { RealOverview } from "@/components/real-overview";

afterEach(cleanup);
function show(address: string, locked = false) {
  mocks.positions = [{ address, vaultId: "sol", symbol: "SOL", tokenAmount: "1", usdcAmount: "1", feeTokenAmount: "0", feeUsdcAmount: "0", locked }];
  render(<RealOverview walletAddress={WITHDRAWAL_PILOT.wallet} onDetails={vi.fn()} />);
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
it.each(["Cosechar Ganancias", "Cerrar y Liquidar"])("keeps %s clickable but does not authorize a new position", (name) => {
  show("new-position");
  expect(screen.getByRole("button", { name })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.queryByText("Revisión de cosecha autorizada")).not.toBeInTheDocument();
  expect(screen.queryByText("Revisión de cierre autorizada")).not.toBeInTheDocument();
});
it("does not authorize closing locked pilot liquidity", () => {
  show(WITHDRAWAL_PILOT.position, true);
  fireEvent.click(screen.getByRole("button", { name: "Cerrar y Liquidar" }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.queryByText("Revisión de cierre autorizada")).not.toBeInTheDocument();
});