import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PilotDeposit } from "@/components/pilot-deposit";
import { FEE_WALLET } from "@/lib/fees";

const mocks = vi.hoisted(() => ({ prepare: vi.fn(), status: vi.fn(), sign: vi.fn() }));
vi.mock("@tanstack/react-query", async (orig) => ({ ...(await orig<object>()), useQueryClient: () => ({ invalidateQueries: () => Promise.resolve() }) }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: unknown }) => children }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/hooks/use-affiliate-report", () => ({ useAffiliateReport: () => async () => undefined }));
vi.mock("@/lib/pilot-deposit.functions", () => ({ preparePilotDeposit: mocks.prepare, pilotDepositStatus: mocks.status }));
vi.mock("@/hooks/use-boveda-session", () => ({ useBovedaSession: () => ({ walletAddress: FEE_WALLET, signAndSend: mocks.sign }) }));
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); mocks.prepare.mockResolvedValue({ success: true, prepared: { transaction: "AQID" } }); mocks.sign.mockResolvedValue("signature"); mocks.status.mockResolvedValue({ status: "confirmed" }); });

describe("selectable Real deposit review", () => {
  it("prepares the reviewed 10,000 USDC and signs only after simulation succeeds", async () => {
    render(<PilotDeposit vaultId="sol" amount="10000" onBusyChange={() => {}} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /depositar/i }));
    await screen.findByText("Depósito confirmado en la red (confirmado).");
    expect(mocks.prepare).toHaveBeenCalledWith({ data: { wallet: FEE_WALLET, vaultId: "sol", amount: "10000" } });
    expect(mocks.sign).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
  });
  it("requires new consent when the selected amount changes", async () => {
    const view = render(<PilotDeposit vaultId="sol" amount="1" onBusyChange={() => {}} />);
    fireEvent.click(screen.getByRole("checkbox"));
    view.rerender(<PilotDeposit vaultId="sol" amount="10000" onBusyChange={() => {}} />);
    await waitFor(() => expect(screen.getByRole("checkbox")).not.toBeChecked());
    expect(screen.getByRole("button", { name: /depositar/i })).toBeDisabled();
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it("does not sign when the fresh simulation rejects a 10,000 USDC deposit", async () => {
    mocks.prepare.mockResolvedValue({ success: false, message: "Saldo insuficiente." });
    render(<PilotDeposit vaultId="sol" amount="10000" onBusyChange={() => {}} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /depositar/i }));
    await screen.findByRole("alert");
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("cannot authorize an amount above 10,000 USDC", () => {
    render(<PilotDeposit vaultId="sol" amount="10000.000001" onBusyChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: /depositar/i })).toBeDisabled();
  });
  it("passes MET deposits to the wallet and checks confirmation automatically", async () => {
    render(<PilotDeposit vaultId="met" amount="1" onBusyChange={() => {}} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /depositar/i }));
    await screen.findByText("Depósito confirmado en la red (confirmado).");
    expect(mocks.prepare).toHaveBeenCalledWith({ data: { wallet: FEE_WALLET, vaultId: "met", amount: "1" } });
    expect(mocks.sign).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
    expect(mocks.status).toHaveBeenCalledWith({ data: { signature: "signature" } });
  });
  it("never checks a sent transaction when Privy rejects the signature", async () => {
    mocks.sign.mockRejectedValue(new Error("User rejected"));
    render(<PilotDeposit vaultId="sol" amount="1" onBusyChange={() => {}} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /depositar/i }));
    await screen.findByRole("alert");
    expect(mocks.status).not.toHaveBeenCalled();
  });
  it("does not report a confirmed deposit when the network rejects it", async () => {
    mocks.status.mockResolvedValue({ status: "failed" });
    render(<PilotDeposit vaultId="sol" amount="1" onBusyChange={() => {}} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /depositar/i }));
    await screen.findByRole("alert");
    expect(screen.queryByText("Depósito confirmado en la red (confirmado).")).toBeNull();
    expect(mocks.sign).toHaveBeenCalledTimes(1);
  });
});