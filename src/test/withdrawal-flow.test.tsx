import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { BovedaSessionContext, type BovedaSession } from "@/hooks/use-boveda-session";
import { WITHDRAWAL_PILOT } from "@/lib/withdrawal";

const mocks = vi.hoisted(() => ({ preview: vi.fn(), prepare: vi.fn(), status: vi.fn(), invalidate: vi.fn(), send: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: unknown }) => children, useRouter: () => null }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/withdrawal.functions", () => ({ simulateRealWithdrawal: mocks.preview, prepareRealWithdrawal: mocks.prepare }));
vi.mock("@/hooks/use-affiliate-report", () => ({ useAffiliateReport: () => async () => undefined }));
vi.mock("@/lib/pilot-deposit.functions", () => ({ pilotDepositStatus: mocks.status }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }), useQueries: () => [] }));
vi.mock("@/lib/sweep-leftovers", () => ({ leftoverSymbols: async () => [], sweepLeftovers: async () => ({ usdc: 0n, converted: 0, failed: [] }) }));
import { WithdrawalSimulation } from "@/components/withdrawal-simulation";

beforeEach(() => { vi.clearAllMocks(); });

it("re-simulates with reviewed limits, signs only as the connected owner and refreshes after confirmation", async () => {
  const result = { success: true, sent: false, message: "Verified", feeRaw: "9640", minimumNetRaw: "954400", fee: "0.00964", minimumGross: "0.96404", minimumNet: "0.9544" };
  mocks.preview.mockResolvedValue(result);
  mocks.prepare.mockResolvedValue({ ...result, prepared: { transaction: btoa("unsigned"), expiresAt: Date.now() + 30_000, wallet: WITHDRAWAL_PILOT.wallet, position: "BnztueWcXv93mgW7yJe8WYpnCxpz34nujPhfjQT6SLu1" } });
  mocks.send.mockResolvedValue("pilot-signature");
  mocks.status.mockResolvedValue({ status: "confirmed" });
  const session: BovedaSession = { ready: true, authenticated: true, userId: "verified-owner", label: "Owner", walletAddress: WITHDRAWAL_PILOT.wallet, error: null, login: vi.fn(), logout: vi.fn(), signAndSend: mocks.send };
  render(<BovedaSessionContext.Provider value={session}><WithdrawalSimulation wallet={WITHDRAWAL_PILOT.wallet} position={"BnztueWcXv93mgW7yJe8WYpnCxpz34nujPhfjQT6SLu1"} vaultId="met" onClose={vi.fn()} /></BovedaSessionContext.Provider>);
  expect(mocks.preview).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.getByRole("button", { name: /Confirmar retiro/ })).toBeEnabled());
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Confirmar retiro" })); });
  await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ["real-solana", WITHDRAWAL_PILOT.wallet] }));
  expect(mocks.prepare).toHaveBeenCalledWith({ data: { wallet: WITHDRAWAL_PILOT.wallet, position: "BnztueWcXv93mgW7yJe8WYpnCxpz34nujPhfjQT6SLu1", vaultId: "met", percent: 100, maximumFeeRaw: "9640", minimumNetRaw: "954400" } });
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(Array.from(mocks.send.mock.calls[0]?.[0] ?? [])).toEqual(Array.from("unsigned").map((c) => c.charCodeAt(0)));
  expect(mocks.status).toHaveBeenCalledWith({ data: { signature: "pilot-signature" } });
});