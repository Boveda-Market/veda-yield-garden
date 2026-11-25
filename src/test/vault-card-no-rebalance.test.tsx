import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ChainPosition } from "@/lib/solana-data";

// The rebalance sheet stays reachable (urgent banner, bell, deep link) but must never appear on a vault card,
// and an out-of-range card must stay silent: no status text, no warning paragraph.
vi.mock("@/components/rebalance-button", () => ({ RebalanceButton: () => <button type="button">REBALANCE-MARKER</button> }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: unknown }) => children,
  useRouter: () => null,
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-query", () => ({
  useQueries: ({ queries }: { queries: unknown[] }) => queries.map(() => ({ data: undefined })),
  useQuery: () => ({ data: undefined, refetch: vi.fn() }),
  useQueryClient: () => ({ getQueryData: () => undefined, invalidateQueries: vi.fn() }),
}));
vi.mock("@/components/autopilot-toggle", () => ({ useAutopilot: () => ({ status: { enabled: true, failures: 0 } }) }));
vi.mock("@/components/migrate-banner", () => ({ MigrateOffer: () => null }));
vi.mock("@/components/migrate-picker", () => ({ MigratePicker: () => null }));
vi.mock("@/lib/migrate-policy.functions", () => ({ getMigratePolicy: vi.fn(async () => ({ enabled: false })), setMigratePolicy: vi.fn() }));
vi.mock("@/lib/autopilot.functions", () => ({ autopilotStatus: vi.fn(), enableAutopilot: vi.fn(), disableAutopilot: vi.fn() }));

// The Mi Billetera card list comes from the shared wallet read; feed it from the test.
const walletState = vi.hoisted(() => ({ positions: [] as unknown[] }));
vi.mock("@/hooks/use-real-wallet", () => ({
  useRealWallet: () => ({ data: { success: true, data: { positions: walletState.positions, positionsComplete: true } } }),
}));
vi.mock("@/components/harvest-dialog", () => ({ HarvestDialog: () => null }));
vi.mock("@/components/withdrawal-simulation", () => ({ WithdrawalSimulation: () => null }));
vi.mock("@/components/multi-close-sheet", () => ({ MultiCloseSheet: () => null }));
vi.mock("@/components/deposit-simulation", () => ({ DepositSimulation: () => null }));

import { RealPositions } from "@/components/real-positions";
import { WalletPositions } from "@/components/wallet-positions";

afterEach(cleanup);

const outOfRange = {
  address: "pos-out-of-range",
  vaultId: "gta6",
  symbol: "GTA6",
  tokenAmount: "1",
  usdcAmount: "1",
  feeTokenAmount: "0",
  feeUsdcAmount: "0",
  locked: false,
  outOfRange: true,
} as unknown as ChainPosition;

function show(positions: ChainPosition[]) {
  render(<RealPositions positions={positions} onAction={vi.fn()} showHarvestBanner={false} />);
}

function showWallet(positions: ChainPosition[]) {
  walletState.positions = positions;
  render(<WalletPositions wallet="wallet1" />);
}

it("renders the out-of-range vault card without a manual rebalance button", () => {
  show([outOfRange]);
  // The card is really on screen, so a missing marker means the button was not rendered (not a blank render).
  expect(screen.getByRole("button", { name: "Cosechar dólares" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retirar" })).toBeInTheDocument();
  expect(screen.queryByText("REBALANCE-MARKER")).not.toBeInTheDocument();
});

it("says nothing about range on an out-of-range vault card", () => {
  show([outOfRange]);
  expect(screen.getByRole("button", { name: "Cosechar dólares" })).toBeInTheDocument();
  expect(screen.queryByText(/fuera de rango/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/🔄/)).not.toBeInTheDocument();
  // The hot-zone chip is hidden too, so the card never hints at the status.
  expect(screen.queryByText(/en la zona caliente/i)).not.toBeInTheDocument();
});

it("keeps the same actions on a normal active vault card", () => {
  show([{ ...outOfRange, outOfRange: false }]);
  expect(screen.getByRole("button", { name: "Cosechar dólares" })).toBeInTheDocument();
  expect(screen.queryByText("REBALANCE-MARKER")).not.toBeInTheDocument();
});

it("says nothing about range on the Mi Billetera vault card", () => {
  showWallet([outOfRange]);
  // The card is really on screen, so a missing warning means it was not rendered (not a blank render).
  expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  expect(screen.queryByText(/fuera de rango/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/salió del rango/i)).not.toBeInTheDocument();
});
