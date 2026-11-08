import type { BalancePoint } from "@/lib/portfolio";

export function PortfolioChart({ points, unit }: { points: BalancePoint[]; unit: string }) {
  if (points.length < 2) return <div className="grid h-64 place-items-center border-y border-border px-6 text-center"><div><p className="font-display font-semibold">Tu gráfica empieza aquí</p><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Necesitamos al menos dos lecturas. No inventamos valores anteriores a tu primera visita.</p>{points[0] && <p className="mt-4 text-sm">Primera lectura: {points[0].balance.toLocaleString("es-PR", { maximumFractionDigits: 6 })} {unit}</p>}</div></div>;
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return null;
  const minimum = Math.min(...points.map((point) => point.balance));
  const maximum = Math.max(...points.map((point) => point.balance));
  const range = Math.max(maximum - minimum, 0.000001);
  const elapsed = Math.max(last.at - first.at, 1);
  const coordinates = points.map((point) => ({ ...point, x: 80 + (point.at - first.at) / elapsed * 610, y: 190 - (point.balance - minimum) / range * 150 }));
  return <div className="min-w-0 w-full"><svg viewBox="0 0 720 240" className="h-64 w-full" role="img" aria-label={`Evolución del saldo: ${first.balance} a ${last.balance} ${unit}`}>
    {[40, 115, 190].map((y) => <line key={y} x1="80" y1={y} x2="690" y2={y} stroke="var(--border)" />)}
    <text x="4" y="44" fill="var(--muted-foreground)" fontSize="13">{maximum.toLocaleString("es-PR", { maximumFractionDigits: 6 })}</text><text x="4" y="194" fill="var(--muted-foreground)" fontSize="13">{minimum.toLocaleString("es-PR", { maximumFractionDigits: 6 })}</text>
    <polyline points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="var(--primary)" strokeWidth="2.5" />
    {coordinates.filter((_, index) => index === 0 || index === coordinates.length - 1).map((point) => <circle key={point.at} cx={point.x} cy={point.y} r="4" fill="var(--primary)"><title>{new Date(point.at).toLocaleString("es-PR")} · {point.balance} {unit}</title></circle>)}
    <text x="80" y="226" fill="var(--muted-foreground)" fontSize="13">{new Date(first.at).toLocaleDateString("es-PR")}</text><text x="690" y="226" textAnchor="end" fill="var(--muted-foreground)" fontSize="13">{new Date(last.at).toLocaleDateString("es-PR")}</text>
  </svg><p className="text-xs text-muted-foreground">Última lectura: {last.balance.toLocaleString("es-PR", { maximumFractionDigits: 6 })} {unit} · {new Date(last.at).toLocaleString("es-PR")}</p></div>;
}