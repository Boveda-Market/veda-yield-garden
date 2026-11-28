import type { ReactNode } from "react";
import { Check, X } from "lucide-react";

/** Reusable, theme-token visuals for blog posts: photo, stat cards, bar chart, donut and comparison table. */
export function Figure({ src, alt, caption }: { src: string; alt: string; caption?: ReactNode }) {
  return <figure className="not-prose my-2">
    <img src={src} alt={alt} loading="lazy" className="aspect-video w-full rounded-2xl border border-border object-cover" />
    {caption && <figcaption className="mt-2 text-xs leading-5 text-muted-foreground">{caption}</figcaption>}
  </figure>;
}

export function StatCards({ items }: { items: { value: string; label: string }[] }) {
  return <div className="grid grid-cols-2 gap-3">{items.map((s) => <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
    <p className="font-display text-3xl font-bold text-primary">{s.value}</p>
    <p className="mt-1 text-sm leading-5 text-muted-foreground">{s.label}</p>
  </div>)}</div>;
}

export function BarChart({ title, bars, note, unit = "" }: {
  title: string;
  bars: { label: string; value: number; detail?: string; tone?: "default" | "negative" | "highlight" }[];
  note?: ReactNode;
  unit?: string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 0);
  const description = bars.map((b) => `${b.label}: ${unit}${b.value.toLocaleString("en-US")}${b.detail ? `, ${b.detail}` : ""}`).join(". ");
  return <figure className="not-prose rounded-3xl border border-border bg-card p-5">
    <figcaption className="font-display text-base font-bold leading-6 text-foreground">{title}</figcaption>
    <div className="mt-6" role="img" aria-label={`${title}. ${description}`}>
      <div className="flex gap-2">
        {bars.map((b, i) => <div key={`${b.label}-${i}`} className="min-w-0 flex-1 text-center">
          <p className={`font-display text-xl font-bold ${b.tone === "highlight" ? "text-primary" : "text-foreground"}`}>{unit}{b.value.toLocaleString("en-US")}</p>
          <p className={`mt-1 min-h-8 text-[11px] font-semibold leading-4 ${b.tone === "negative" ? "text-destructive" : b.tone === "highlight" ? "text-primary" : "text-muted-foreground"}`}>{b.detail}</p>
        </div>)}
      </div>
      <div className="relative mt-2 h-44 border-b border-border">
        <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
          {[0, 1, 2, 3].map((line) => <div key={line} className="border-t border-border/50" />)}
        </div>
        <div className="absolute inset-0 flex items-end gap-2 px-1">
          {bars.map((b, i) => <div key={`${b.label}-${i}`} className="flex h-full min-w-0 flex-1 items-end">
            <div
              className={`w-full rounded-t-xl ${b.tone === "negative" ? "bg-destructive/80" : b.tone === "highlight" ? "bg-primary" : "bg-primary/55"}`}
              style={{ height: `${max > 0 ? (b.value / max) * 100 : 0}%` }}
            />
          </div>)}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {bars.map((b, i) => <p key={`${b.label}-${i}`} className="min-w-0 flex-1 text-center text-xs font-medium leading-4 text-muted-foreground">{b.label}</p>)}
      </div>
    </div>
    {note && <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">{note}</p>}
  </figure>;
}

export function Donut({ percent, title, label, note }: { percent: number; title: string; label: string; note?: ReactNode }) {
  const r = 40, c = 2 * Math.PI * r;
  return <figure className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
    <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label={`${percent}% ${label}`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="14" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--primary)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(percent / 100) * c} ${c}`} />
    </svg>
    <figcaption><p className="font-display text-3xl font-bold text-primary">{percent} %</p><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{label}</p>{note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}</figcaption>
  </figure>;
}

export function CompareTable({ cols, rows, highlight }: { cols: string[]; rows: { label: string; cells: string[] }[]; highlight?: number }) {
  return <div className="overflow-x-auto rounded-2xl border border-border bg-card">
    <table className="w-full min-w-[480px] text-left text-sm leading-5">
      <thead><tr className="border-b border-border"><th className="p-3" />{cols.map((c, i) => <th key={c} className={`p-3 font-semibold ${i === highlight ? "bg-primary/10 text-primary" : "text-foreground"}`}>{c}</th>)}</tr></thead>
      <tbody>{rows.map((r) => <tr key={r.label} className="border-b border-border last:border-0">
        <th className="p-3 font-medium text-muted-foreground">{r.label}</th>
        {r.cells.map((x, i) => <td key={i} className={`p-3 ${i === highlight ? "bg-primary/10 text-foreground" : "text-foreground/80"}`}>{x}</td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

/** Two columns of short bullets: what works in favor and what doesn't. Stacks on phones. */
export function ProsCons({ prosTitle, consTitle, pros, cons }: { prosTitle: string; consTitle: string; pros: string[]; cons: string[] }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-primary">{prosTitle}</p>
      <ul className="mt-3 space-y-2 text-sm leading-5 text-foreground/80">{pros.map((p) => <li key={p} className="flex gap-2"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" /><span>{p}</span></li>)}</ul>
    </div>
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-destructive">{consTitle}</p>
      <ul className="mt-3 space-y-2 text-sm leading-5 text-foreground/80">{cons.map((c) => <li key={c} className="flex gap-2"><X aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" /><span>{c}</span></li>)}</ul>
    </div>
  </div>;
}

/** A short highlighted line for the one thing the reader must not forget. */
export function Callout({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm font-medium leading-6 text-foreground">{children}</p>;
}

/** A short numbered list the reader can run through in seconds. */
export function Checklist({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-2xl border border-border bg-card p-4">
    <p className="text-sm font-semibold text-foreground">{title}</p>
    <ol className="mt-3 space-y-2 text-sm leading-5 text-foreground/80">{items.map((it, i) => <li key={it} className="flex gap-3"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">{i + 1}</span><span>{it}</span></li>)}</ol>
  </div>;
}
