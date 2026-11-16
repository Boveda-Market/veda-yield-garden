import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { useT } from "@/lib/i18n";

/**
 * Big tappable amount: the number itself is the input, so there is no separate
 * "Otra cantidad" button. The keyboard only opens when the person taps the number
 * (never autofocused), so it never covers the quote or the confirm button on open.
 */
export function TapAmount({ value, onChange, onCommit, label, prefix, suffix, placeholder = "0", inputMode = "decimal", maxLength = 12, disabled, id, className = "" }: {
  value: string; onChange: (v: string) => void; onCommit?: () => void; label: string; prefix?: ReactNode; suffix?: ReactNode;
  placeholder?: string; inputMode?: "decimal" | "numeric"; maxLength?: number; disabled?: boolean; id?: string; className?: string;
}) {
  const t = useT();
  const chars = Math.max(1, (value || placeholder).length);
  return <label className={`group flex cursor-text items-baseline gap-1 border-b-2 border-dashed border-primary/40 pb-1 transition-colors focus-within:border-solid focus-within:border-primary ${disabled ? "pointer-events-none opacity-60" : ""} ${className}`}>
    {prefix != null && <span className="font-display text-3xl font-bold tabular-nums">{prefix}</span>}
    <input id={id} aria-label={label} inputMode={inputMode} enterKeyHint="done" autoComplete="off" placeholder={placeholder} value={value} maxLength={maxLength} disabled={disabled}
      style={{ width: `${chars + 0.15}ch` }}
      className="min-w-0 max-w-full bg-transparent p-0 font-display text-3xl font-bold tabular-nums text-foreground outline-none placeholder:text-foreground"
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => onCommit?.()} />
    {suffix != null && <span className="font-display text-xl font-bold text-muted-foreground">{suffix}</span>}
    <span aria-hidden className="ml-auto flex shrink-0 items-center gap-1 self-center text-xs font-semibold text-primary group-focus-within:hidden"><Pencil size={14} />{t("Toca para cambiar")}</span>
  </label>;
}
