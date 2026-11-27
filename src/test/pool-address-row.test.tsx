import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PoolDetails } from "@/components/pool-details";
import { VAULTS } from "@/lib/vaults";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function mountTrump() {
  const vault = VAULTS.find((v) => v.id === "trump");
  if (!vault) throw new Error("TRUMP vault missing");
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));
  const { container } = render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><PoolDetails vault={vault} onClose={() => {}} /></QueryClientProvider>);
  return { vault, container };
}

function openStatsTab() {
  fireEvent.click(screen.getByRole("tab", { name: "Estadísticas del Pool" }));
}

describe("pool address row", () => {
  it("on «Rendimiento y Mercado»: links the full address to its pool page above the official contract and keeps a copy button", () => {
    const { vault } = mountTrump();
    const link = screen.getByRole("link", { name: "Ver la página del pool" });
    const contractRow = screen.getByRole("button", { name: "Copiar contrato" });
    expect(link).toHaveAttribute("href", `https://app.meteora.ag/dlmm/${vault.pool}`);
    expect(screen.getByRole("button", { name: "Copiar dirección del pool" })).toBeInTheDocument();
    expect(contractRow).toHaveTextContent("6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN");
    expect(link.compareDocumentPosition(contractRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("copies the complete pool web URL from the stats tab", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { vault } = mountTrump();
    openStatsTab();
    const link = screen.getByRole("link", { name: "Ver la página del pool" });
    expect(link).toHaveAttribute("href", `https://app.meteora.ag/dlmm/${vault.pool}`);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copiar dirección del pool" })); });
    expect(writeText).toHaveBeenCalledWith(`https://app.meteora.ag/dlmm/${vault.pool}`);
  });
});
