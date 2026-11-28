import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import type { Vault } from "@/lib/vaults";

/**
 * Shared pool-reference row: the full web URL wraps on narrow screens,
 * with open and copy actions integrated into the header.
 * Used by «Rendimiento y Mercado» (above the official contract) and by
 * «Estadísticas del Pool», so both tabs show the exact same thing.
 */
export function PoolAddressRow({ vault }: { vault: Vault }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const url = `https://solscan.io/account/${vault.pool}`;

  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/50 px-3 pb-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Dirección del pool")}</p>
          <div className="flex shrink-0 items-center">
            <Button
              type="button" variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground"
              onClick={() => { void navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); }}
              aria-label={t("Copiar dirección del pool")} title={t("Copiar dirección del pool")}
            >
              {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
            </Button>
            <Button asChild variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground">
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label={t("Ver la página del pool")} title={t("Ver la página del pool")}>
                <ExternalLink size={16} />
              </a>
            </Button>
          </div>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="block break-all rounded-sm font-mono text-xs leading-5 text-foreground underline decoration-border underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">{url}</a>
    </div>
  );
}
