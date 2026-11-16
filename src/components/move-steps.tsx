import { Check, LoaderCircle } from "lucide-react";
import { useT } from "@/lib/i18n";

/** The same three steps the user sees in every money action: Aprobar → Esperar → Resultado. */
export function FlowSteps({ current }: { current: 1 | 2 | 3 }) {
  const t = useT();
  const steps = [t("Aprobar"), t("Esperar"), t("Resultado")];
  return <ol aria-label={t("Progreso")} className="grid w-full grid-cols-3 gap-2">{steps.map((text, i) => {
    const n = i + 1; const done = n < current || current === 3; const active = n === current;
    return <li key={text} aria-current={active ? "step" : undefined} className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs ${active ? "border-primary bg-primary/10 font-semibold" : done ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${done || active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{done && !active ? <Check size={12} /> : n}</span>{text}
    </li>;
  })}</ol>;
}

/** Multi-approval operations still show the three user steps; the inner approvals chain automatically under "Esperar". */
export function ProgressSteps({ steps, current, label }: { steps: string[]; current: number; label?: string }) {
  const t = useT();
  return <div aria-label={label} className="grid gap-1">
    <FlowSteps current={2} />
    <p className="text-center text-[11px] text-muted-foreground">{steps[current - 1] ?? ""}{steps.length > 1 ? ` · ${t("{n} de {m}", { n: String(Math.min(current, steps.length)), m: String(steps.length) })}` : ""}</p>
  </div>;
}

/** Vault move: same three steps, with the current half shown underneath. */
export function MoveSteps({ current, from, to }: { current: 1 | 2; from?: string; to: string }) {
  const t = useT();
  return <ProgressSteps steps={[t("Cerrar bóveda actual"), t("Depositar en {v}", { v: to })]} current={current} label={from ? `${from} → ${to}` : to} />;
}

/** Calm "working on it" line shown while the wallet approval or network confirmation is in progress. */
export function WorkingLine({ text }: { text: string }) {
  return <p role="status" className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm font-medium"><LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" />{text}</p>;
}
