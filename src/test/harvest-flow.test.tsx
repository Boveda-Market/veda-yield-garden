import { act, fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BovedaSessionContext, type BovedaSession } from "@/hooks/use-boveda-session";
const mocks = vi.hoisted(() => ({ review: vi.fn(), prepare: vi.fn(), send: vi.fn(), status: vi.fn(), invalidate: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: unknown }) => children }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock("@/lib/harvest.functions", () => ({ simulateRealHarvest: mocks.review, prepareRealHarvest: mocks.prepare }));
vi.mock("@/hooks/use-affiliate-report", () => ({ useAffiliateReport: () => async () => undefined }));
vi.mock("@/lib/pilot-deposit.functions", () => ({ pilotDepositStatus: mocks.status }));
import { HarvestDialog } from "@/components/harvest-dialog";
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const wallet = "GZ3wFmrMdXJAigwooa8GTginE6tLeTzgGLbXhgYTp7HR", position = "BnztueWcXv93mgW7yJe8WYpnCxpz34nujPhfjQT6SLu1";
function show(connected = wallet) {
  const session: BovedaSession = { ready: true, authenticated: true, userId: "verified", label: "Owner", walletAddress: connected, error: null, login: vi.fn(), logout: vi.fn(), signAndSend: mocks.send };
  render(<BovedaSessionContext.Provider value={session}><HarvestDialog wallet={wallet} position={position} vaultId="met" onClose={vi.fn()} /></BovedaSessionContext.Provider>);
}
it("reviews, obtains consent and freshly prepares new MET harvests before owner signing", async () => {
  mocks.review.mockResolvedValue({ success: true, feeRaw: "100" });
  mocks.prepare.mockResolvedValue({ success: true, prepared: { wallet, position, transaction: btoa("unsigned"), expiresAt: Date.now() + 30_000 } });
  mocks.send.mockResolvedValue("signature");
  mocks.status.mockResolvedValue({ status: "confirmed" });
  show();
  fireEvent.click(screen.getByRole("button", { name: "Revisar cosecha" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Firmar cosecha" })).toBeDisabled());
  expect(mocks.prepare).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox", { name: "Acepto la cosecha real" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Firmar cosecha" })));
  expect(mocks.prepare).toHaveBeenCalledWith({ data: { wallet, position, vaultId: "met", maximumFeeRaw: "100" } });
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ["meteora-history", wallet] });
});
it("does not enable owner signing with a different connected wallet", async () => {
  mocks.review.mockResolvedValue({ success: true, feeRaw: "100" });
  show(position);
  fireEvent.click(screen.getByRole("button", { name: "Revisar cosecha" }));
  await waitFor(() => expect(mocks.review).toHaveBeenCalled());
  expect(screen.queryByRole("button", { name: "Firmar cosecha" })).not.toBeInTheDocument();
  expect(mocks.send).not.toHaveBeenCalled();
});