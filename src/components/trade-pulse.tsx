import { useEffect, useRef, useState, type ReactNode } from "react";
import { Flame } from "lucide-react";
import { useT } from "@/lib/i18n";
import { subscribeRoundTrades, tradePulse, type LiveTrade } from "@/lib/polymarket-trades";

type Pill = { id: string; side: LiveTrade["side"]; usd: number; x: number; born: number };
const money = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v >= 10 ? Math.round(v) : v.toFixed(0)}`);

/**
 * Wraps the round chart with genuine live market activity: each pill is a real purchase in this exact round
 * received from the market feed (largest one every ~0.5 s so the chart stays readable), plus a last-minute tally.
 */
export function TradePulse({ slug, children }: { slug: string | null; children: ReactNode }) {
  const t = useT();
  const [pills, setPills] = useState<Pill[]>([]);
  const [stats, setStats] = useState<{ count: number; usd: number; up: number; down: number } | null>(null);
  const [since, setSince] = useState(0);
  const pending = useRef<LiveTrade[]>([]);
  const recent = useRef<LiveTrade[]>([]);

  useEffect(() => {
    setPills([]); setStats(null); pending.current = []; recent.current = [];
    if (!slug) return;
    setSince(Date.now());
    const off = subscribeRoundTrades(slug, (fresh) => {
      for (const k of fresh) if (k.buy && k.usd >= 1) pending.current.push(k);
      recent.current.push(...fresh);
    });
    const id = setInterval(() => {
      const now = Date.now();
      const best = pending.current.reduce<LiveTrade | null>((b, k) => (!b || k.usd > b.usd ? k : b), null);
      pending.current = [];
      setPills((p) => {
        const alive = p.filter((x) => now - x.born < 2_600);
        return best ? [...alive, { id: best.id, side: best.side, usd: best.usd, x: 8 + Math.random() * 70, born: now }].slice(-7) : alive;
      });
      recent.current = recent.current.filter((k) => k.t >= now - 65_000);
      setStats(tradePulse(recent.current, now));
    }, 500);
    return () => { off(); clearInterval(id); };
  }, [slug]);

  const fullMinute = since > 0 && Date.now() - since >= 60_000;
  return <div>
    <div className="relative">
      {children}
      <div className="pointer-events-none absolute right-3 top-14 h-36 w-1/2 overflow-hidden" aria-hidden>
        {pills.map((p) => <span key={p.id} className={`animate-trade-float absolute bottom-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums shadow-md ${p.side === "up" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`} style={{ left: `${p.x}%` }}>+{money(p.usd)} {p.side === "up" ? "▲" : "▼"}</span>)}
      </div>
    </div>
    {stats && stats.count > 0 && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-semibold tabular-nums text-muted-foreground" aria-live="off">
      <span className="flex items-center gap-1"><Flame size={13} className="text-strike" />{fullMinute ? t("{n} jugadas · {v} en el último minuto", { n: stats.count, v: money(stats.usd) }) : t("{n} jugadas · {v} desde que abriste", { n: stats.count, v: money(stats.usd) })}</span>
      <span><span className="text-primary">▲ {money(stats.up)}</span> · <span className="text-destructive">▼ {money(stats.down)}</span></span>
    </div>}
  </div>;
}
