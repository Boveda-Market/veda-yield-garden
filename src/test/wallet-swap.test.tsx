import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WalletSwap } from "@/components/wallet-swap";
import { SWAP_TOKENS } from "@/lib/wallet-actions";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
function mount(balance = 200_000_000n) {
  const confirm = vi.fn(async () => {});
  const fetcher = vi.fn(async (_url: string) => ({ ok: true, json: async () => ({ outAmount: "500000000", otherAmountThreshold: "497500000", priceImpactPct: "0", platformFee: { amount: "1000000" } }) }));
  vi.stubGlobal("fetch", fetcher);
  function Harness() {
    return <WalletSwap balances={{ USDC: balance, SOL: balance, MET: balance }} busy={false} onConfirm={confirm} />;
  }
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><Harness /></QueryClientProvider>);
  return { confirm, fetcher };
}
describe("wallet swap review", () => {
  it("offers JupUSD and MET and keeps the unvalidated SPCX token out of swaps", () => {
    const s = SWAP_TOKENS.map((x) => x.symbol);
    expect(s).toEqual(expect.arrayContaining(["USDC", "JupUSD", "SOL", "MET"]));
    expect(s).not.toContain("SPCX");
  });
  it("allows pairs without USDC", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Moneda que pagas"), { target: { value: "MET" } });
    fireEvent.change(screen.getByLabelText("Moneda que recibes"), { target: { value: "SOL" } });
    expect(screen.getByLabelText("Moneda que pagas")).toHaveValue("MET");
    expect(screen.getByLabelText("Moneda que recibes")).toHaveValue("SOL");
  });
  it("quotes automatically with no swap fee and only signs on confirmation", async () => {
    const { fetcher, confirm } = mount();
    fireEvent.change(screen.getByLabelText("Pagas"), { target: { value: "100" } });
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce(), { timeout: 2000 });
    expect(fetcher.mock.calls[0]?.[0]).toContain("amount=100000000");
    const button = screen.getByRole("button", { name: "Confirmar y firmar cambio" });
    await waitFor(() => expect(button).toBeEnabled());
    expect(confirm).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(button); });
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ amount: 100_000_000n, feeUsdc: "0", outAmount: "500000000" }));
  });
  it("invalidates the reviewed amount immediately after an edit", async () => {
    const { confirm } = mount();
    fireEvent.change(screen.getByLabelText("Pagas"), { target: { value: "100" } });
    const button = screen.getByRole("button", { name: "Confirmar y firmar cambio" });
    await waitFor(() => expect(button).toBeEnabled(), { timeout: 2000 });
    fireEvent.change(screen.getByLabelText("Pagas"), { target: { value: "50" } });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(confirm).not.toHaveBeenCalled();
  });
  it("allows a preview but never signs an amount above the available balance", async () => {
    const { fetcher, confirm } = mount(10_000_000n);
    fireEvent.change(screen.getByLabelText("Pagas"), { target: { value: "100" } });
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce(), { timeout: 2000 });
    const button = screen.getByRole("button", { name: "Confirmar y firmar cambio" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(confirm).not.toHaveBeenCalled();
  });
  it("requires a new input after reversing direction", async () => {
    const { confirm } = mount();
    fireEvent.change(screen.getByLabelText("Pagas"), { target: { value: "100" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar y firmar cambio" })).toBeEnabled(), { timeout: 2000 });
    fireEvent.click(screen.getByRole("button", { name: "Invertir cambio" }));
    expect(screen.getByLabelText("Pagas")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Confirmar y firmar cambio" })).toBeDisabled();
    expect(confirm).not.toHaveBeenCalled();
  });
  it("never signs a quote older than 30 seconds", async () => {
    const { confirm } = mount();
    fireEvent.change(screen.getByLabelText("Pagas"), { target: { value: "100" } });
    const button = screen.getByRole("button", { name: "Confirmar y firmar cambio" });
    await waitFor(() => expect(button).toBeEnabled(), { timeout: 2000 });
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 30_001);
    fireEvent.click(button);
    expect(confirm).not.toHaveBeenCalled();
  });
});