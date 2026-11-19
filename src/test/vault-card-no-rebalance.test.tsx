import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ChainPosition } from "@/lib/solana-data";

// The rebalance sheet stays reachable (urgent banner, bell, deep link) but must never appear on a vault card.
vi.mock("@/components/rebalance-button", () => ({ RebalanceButton: () => <button type="button">REBALANCE-MARKER</button> }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: unknown }) => children, useRouter: () => null }));
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

import { RealPositions } from "@/components/real-positions";

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

it("renders the out-of-range vault card without a manual rebalance button", () => {
  show([outOfRange]);
  // The card is really on screen, so a missing marker means the button was not rendered (not a blank render).
  expect(screen.getByRole("button", { name: "Cosechar dólares" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retirar" })).toBeInTheDocument();
  expect(screen.queryByText("REBALANCE-MARKER")).not.toBeInTheDocument();
});

it("keeps the same actions on a normal active vault card", () => {
  show([{ ...outOfRange, outOfRange: false }]);
  expect(screen.getByRole("button", { name: "Cosechar dólares" })).toBeInTheDocument();
  expect(screen.queryByText("REBALANCE-MARKER")).not.toBeInTheDocument();
});
