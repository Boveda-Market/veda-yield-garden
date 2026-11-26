import type { ReactNode } from "react";

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

export function BarChart({ title, bars, note, unit = "" }: { title: string; bars: { label: string; value: number }[]; note?: ReactNode; unit?: string }) {
  const max = Math.max(...bars.map((b) => b.value));
  return <figure className="rounded-2xl border border-border bg-card p-4">
    <figcaption className="text-sm font-semibold text-foreground">{title}</figcaption>
    <div className="mt-4 flex h-44 items-end gap-2" role="img" aria-label={title}>
      {bars.map((b) => <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
        <span className="text-[11px] font-semibold text-foreground">{unit}{b.value}</span>
        <div className="w-full rounded-t-lg bg-primary" style={{ height: `${(b.value / max) * 100}%`, opacity: 0.45 + 0.55 * (b.value / max) }} />
        <span className="text-[11px] text-muted-foreground">{b.label}</span>
      </div>)}
    </div>
    {note && <p className="mt-3 text-xs leading-5 text-muted-foreground">{note}</p>}
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
