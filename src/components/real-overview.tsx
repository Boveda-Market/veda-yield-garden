import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VAULTS, type Vault } from "@/lib/vaults";

export function RealOverview({ walletAddress, onDetails }: { walletAddress: string | null; onDetails: (vault: Vault) => void }) {
  return <>
    <section aria-label="Estado del modo Real" className="border-y border-border py-8">
      <div className="flex items-center gap-3"><ShieldAlert className="shrink-0 text-primary" size={24} /><h1 className="font-display text-2xl font-semibold">BÓVEDA · Real</h1></div>
      <p role="status" className="mt-4 font-semibold">Operaciones aún no disponibles</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Los depósitos, cosechas, liquidaciones y cargos en Solana todavía no están habilitados. No envíes fondos para operar en BÓVEDA.</p>
      {walletAddress && <p className="mt-4 break-all text-xs text-muted-foreground">Wallet conectada: {walletAddress}</p>}
      <dl className="mt-6 grid gap-5 sm:grid-cols-3">
        <div><dt className="text-sm text-muted-foreground">Saldo USDC en Solana</dt><dd className="mt-1 font-display text-xl">No consultado</dd></div>
        <div><dt className="text-sm text-muted-foreground">Posiciones en Solana</dt><dd className="mt-1 font-display text-xl">No consultadas</dd></div>
        <div><dt className="text-sm text-muted-foreground">Ganancias disponibles</dt><dd className="mt-1 font-display text-xl">No consultadas</dd></div>
      </dl>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">Los créditos y las posiciones de Prueba no aparecen en Real y no se pueden convertir en dinero.</p>
    </section>
    <h2 className="mb-4 mt-10 font-display text-lg font-semibold">Pools de Meteora</h2>
    <div className="grid gap-4 md:grid-cols-3">{VAULTS.map((vault) => <article key={vault.id} className="flex flex-col rounded-lg border border-border bg-card p-6">
      <p className="text-xs text-muted-foreground">Meteora DAMM v2</p><h3 className="mt-4 font-display text-xl font-semibold">{vault.name}</h3><p className="mt-1 text-sm text-muted-foreground">{vault.pair}</p>
      <p className="mt-5 flex-1 text-sm leading-6 text-muted-foreground">{vault.blurb}</p>
      <p className="mt-4 text-xs text-muted-foreground">Depósitos no habilitados · sin APY verificado</p>
      <Button variant="outline" className="mt-4 w-full" onClick={() => onDetails(vault)}>Detalles del pool</Button>
    </article>)}</div>
  </>;
}