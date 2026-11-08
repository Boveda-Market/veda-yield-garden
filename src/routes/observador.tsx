import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RealOverview } from "@/components/real-overview";
import { PoolDetails } from "@/components/pool-details";
import type { Vault } from "@/lib/vaults";

const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const Route = createFileRoute("/observador")({
  head: () => ({ meta: [{ title: "Modo observador — BÓVEDA" }, { name: "description", content: "Consulta en solo lectura el portafolio Real de cualquier wallet pública de Solana." }, { property: "og:title", content: "Modo observador — BÓVEDA" }, { property: "og:description", content: "Portafolio Real de solo lectura a partir de una dirección pública de Solana." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ObserverPage,
});

function ObserverPage() {
  const [input, setInput] = useState("");
  const [wallet, setWallet] = useState<string | null>(null);
  const [details, setDetails] = useState<Vault | null>(null);
  const valid = SOLANA_ADDRESS.test(input.trim());
  return <div className="min-h-screen bg-background text-foreground"><main className="mx-auto max-w-5xl px-5 py-8">
    <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/"><Home size={16} />Volver al inicio</Link></Button>
    <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><Eye size={22} />Modo observador</h1>
    <p className="mt-2 text-sm text-muted-foreground">Solo lectura. Ingresa una wallet pública de Solana para ver su portafolio. No permite firmar ni mover fondos.</p>
    <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (valid) setWallet(input.trim()); }}>
      <input aria-label="Dirección de wallet Solana" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Dirección de wallet Solana" className="h-11 min-w-0 flex-1 rounded-md border border-border bg-card px-3 font-mono text-sm" />
      <Button type="submit" disabled={!valid} className="h-11">Ver portafolio</Button>
    </form>
    {input && !valid && <p className="mt-2 text-xs text-destructive">Dirección no válida.</p>}
    <ClientOnly fallback={null}>{wallet && <div className="mt-6"><RealOverview key={wallet} portfolioOnly readOnly walletAddress={wallet} onDetails={setDetails} /></div>}</ClientOnly>
    {details && <PoolDetails vault={details} onClose={() => setDetails(null)} />}
  </main></div>;
}
