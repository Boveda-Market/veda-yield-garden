import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useT } from "@/lib/i18n";
import { isDlmmVault } from "@/lib/solana-data";
import type { Vault } from "@/lib/vaults";

/**
 * Shared pool-address row: the full pool address written out (it wraps on
 * narrow screens) as a link to that pool's page, plus its own copy button.
 * Used by «Rendimiento y Mercado» (above the official contract) and by
 * «Estadísticas del Pool», so both tabs show the exact same thing.
 */
export function PoolAddressRow({ vault }: { vault: Vault }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-stretch gap-2">
      <a
        href={`https://app.meteora.ag/${isDlmmVault(vault.id) ? "dlmm" : "dammv2"}/${vault.pool}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("Ver la página del pool")}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Dirección del pool")}</p>
          <p className="break-all font-mono text-[11px] leading-4">{vault.pool}</p>
        </div>
        <ExternalLink size={16} className="shrink-0 text-muted-foreground" />
      </a>
      <button
        type="button"
        onClick={() => { void navigator.clipboard.writeText(vault.pool).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); }}
        aria-label={t("Copiar dirección del pool")}
        className="flex shrink-0 items-center rounded-xl border border-border bg-muted/50 px-3"
      >
        {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} className="text-muted-foreground" />}
      </button>
    </div>
  );
}
