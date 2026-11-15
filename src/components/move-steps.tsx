import { Check, LoaderCircle } from "lucide-react";
import { useT } from "@/lib/i18n";

/** Numbered progress for operations that need several approvals in a row, so the user always sees where they are. */
export function ProgressSteps({ steps, current, label }: { steps: string[]; current: number; label?: string }) {
  return <ol aria-label={label} className={`grid gap-2 ${steps.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>{steps.map((text, i) => {
    const n = i + 1; const done = n < current; const active = n === current;
    return <li key={text} aria-current={active ? "step" : undefined} className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${active ? "border-primary bg-primary/10 font-semibold" : done ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${done || active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{done ? <Check size={12} /> : n}</span>{text}
    </li>;
  })}</ol>;
}

/** Two-step progress shown across both windows of a vault move. */
export function MoveSteps({ current, from, to }: { current: 1 | 2; from?: string; to: string }) {
  const t = useT();
  return <ProgressSteps steps={[t("Cerrar bóveda actual"), t("Depositar en {v}", { v: to })]} current={current} label={from ? `${from} → ${to}` : to} />;
}

/** Calm "working on it" line shown while the wallet approval or network confirmation is in progress. */
export function WorkingLine({ text }: { text: string }) {
  return <p role="status" className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm font-medium"><LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" />{text}</p>;
}
