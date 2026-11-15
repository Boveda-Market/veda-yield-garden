import { Check } from "lucide-react";
import { useT } from "@/lib/i18n";

/** Two-step progress shown across both windows of a vault move, so the user always sees where they are. */
export function MoveSteps({ current, from, to }: { current: 1 | 2; from?: string; to: string }) {
  const t = useT();
  const steps = [t("Cerrar bóveda actual"), t("Depositar en {v}", { v: to })];
  return <ol aria-label={from ? `${from} → ${to}` : to} className="grid grid-cols-2 gap-2">{steps.map((label, i) => {
    const n = i + 1; const done = n < current; const active = n === current;
    return <li key={label} aria-current={active ? "step" : undefined} className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${active ? "border-primary bg-primary/10 font-semibold" : done ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${done || active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{done ? <Check size={12} /> : n}</span>{label}
    </li>;
  })}</ol>;
}
