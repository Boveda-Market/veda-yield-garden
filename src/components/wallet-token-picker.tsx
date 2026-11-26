import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TokenIcon } from "@/components/token-icon";
import { useT } from "@/lib/i18n";
import { SWAP_TOKENS, swapToken } from "@/lib/wallet-actions";
import { coinLabel } from "@/lib/coin-label";

/** One allowlisted coin menu for both swapping and sending; balances never become authorizations. */
export function WalletTokenPicker({ value, balances, onChange, label, disabled = false }: {
  value: string;
  balances: Record<string, bigint | undefined>;
  onChange: (symbol: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const format = (symbol: string) => {
    const raw = balances[symbol];
    if (raw === undefined) return "—";
    return (Number(raw) / 10 ** swapToken(symbol).decimals).toLocaleString("en-US", { maximumFractionDigits: 6 });
  };
  const tokens = SWAP_TOKENS.filter((x) => `${coinLabel(x.symbol)} ${x.mint}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => Number((balances[b.symbol] ?? 0n) > 0n) - Number((balances[a.symbol] ?? 0n) > 0n));
  return <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
    <PopoverTrigger asChild>
      <Button variant="outline" disabled={disabled} aria-label={label} className="h-11 shrink-0 gap-1.5 rounded-full border-border bg-background px-2 font-semibold">
        <TokenIcon symbol={value} size={26} /><span>{coinLabel(value)}</span><ChevronDown className="size-4 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" sideOffset={6} collisionPadding={12} onOpenAutoFocus={(e) => e.preventDefault()}
      className="z-[60] w-80 max-w-[calc(100vw-24px)] p-2">
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input aria-label={t("Buscar moneda")} placeholder={t("Buscar moneda")} value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 pl-9" />
      </div>
      <div role="listbox" aria-label={label} className="max-h-[min(360px,45dvh)] overflow-y-auto overscroll-contain">
        {tokens.map((token) => <Button key={token.mint} variant="ghost" role="option" aria-selected={value === token.symbol}
          disabled={disabled} onClick={() => { onChange(token.symbol); setOpen(false); setSearch(""); }}
          className="grid h-auto min-h-14 w-full grid-cols-[32px_minmax(0,1fr)_auto] justify-start gap-3 whitespace-normal rounded-md px-2 py-2 text-left">
          <TokenIcon symbol={token.symbol} size={32} />
          <span className="min-w-0"><span className="flex items-center gap-1.5 font-semibold">{coinLabel(token.symbol)}{value === token.symbol && <Check className="size-3.5 text-primary" />}</span>
            <span className="block truncate text-[11px] font-normal text-muted-foreground">{token.mint.slice(0, 4)}…{token.mint.slice(-4)}</span></span>
          <span className="min-w-0 text-right"><span className="block max-w-28 truncate text-sm tabular-nums">{format(token.symbol)}</span><span className="block text-[10px] font-normal text-muted-foreground">{t("Disponible")}</span></span>
        </Button>)}
        {!tokens.length && <p className="p-4 text-center text-sm text-muted-foreground">{t("No se encontraron monedas.")}</p>}
      </div>
    </PopoverContent>
  </Popover>;
}