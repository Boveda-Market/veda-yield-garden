import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { BovedaSessionContext, type BovedaSession } from "@/hooks/use-boveda-session";
import { WITHDRAWAL_PILOT } from "@/lib/withdrawal";

const mocks = vi.hoisted(() => ({ preview: vi.fn(), prepare: vi.fn(), status: vi.fn(), invalidate: vi.fn(), send: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/withdrawal.functions", () => ({ simulateRealWithdrawal: mocks.preview, prepareRealWithdrawal: mocks.prepare }));
vi.mock("@/lib/pilot-deposit.functions", () => ({ pilotDepositStatus: mocks.status }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
import { WithdrawalSimulation } from "@/components/withdrawal-simulation";

beforeEach(() => { vi.clearAllMocks(); });

it("re-simulates with reviewed limits, signs only as the connected owner and refreshes after confirmation", async () => {
  const result = { success: true, sent: false, message: "Verified", feeRaw: "9640", minimumNetRaw: "954400", fee: "0.00964", minimumGross: "0.96404", minimumNet: "0.9544" };
  mocks.preview.mockResolvedValue(result);
  mocks.prepare.mockResolvedValue({ ...result, prepared: { transaction: btoa("unsigned"), expiresAt: Date.now() + 30_000, wallet: WITHDRAWAL_PILOT.wallet, position: WITHDRAWAL_PILOT.position } });
  mocks.send.mockResolvedValue("pilot-signature");
  mocks.status.mockResolvedValue({ status: "confirmed" });
  const session: BovedaSession = { ready: true, authenticated: true, userId: "verified-owner", label: "Owner", walletAddress: WITHDRAWAL_PILOT.wallet, error: null, login: vi.fn(), logout: vi.fn(), signAndSend: mocks.send };
  render(<BovedaSessionContext.Provider value={session}><WithdrawalSimulation wallet={WITHDRAWAL_PILOT.wallet} position={WITHDRAWAL_PILOT.position} vaultId="sol" onClose={vi.fn()} /></BovedaSessionContext.Provider>);
  fireEvent.click(screen.getByRole("button", { name: "Simular retiro y recuperación de renta" }));
  await waitFor(() => expect(screen.getByRole("checkbox", { name: "Acepto la liquidación piloto" })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("checkbox", { name: "Acepto la liquidación piloto" }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Firmar liquidación a USDC" })); });
  await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ["real-solana", WITHDRAWAL_PILOT.wallet] }));
  expect(mocks.prepare).toHaveBeenCalledWith({ data: { wallet: WITHDRAWAL_PILOT.wallet, position: WITHDRAWAL_PILOT.position, vaultId: "sol", maximumFeeRaw: "9640", minimumNetRaw: "954400" } });
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(Array.from(mocks.send.mock.calls[0]?.[0] ?? [])).toEqual(Array.from("unsigned").map((c) => c.charCodeAt(0)));
  expect(mocks.status).toHaveBeenCalledWith({ data: { signature: "pilot-signature" } });
});