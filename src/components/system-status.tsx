import { useQuery } from "@tanstack/react-query";
import { getSystemStatus, type ServiceState, type GlobalMetric } from "@/lib/system-status.functions";
import { useT } from "@/lib/i18n";

const SERVICE_LABEL: Record<string, string> = {
  network: "Red y transacciones", vaults: "Bóvedas de liquidez", predict: "Predicciones Sube o Baja",
  markets: "Mercados de predicción", wallets: "Billeteras y acceso seguro", funding: "Compra y retiro de fondos",
};
const DOT: Record<ServiceState, string> = { up: "bg-primary", degraded: "bg-accent", down: "bg-destructive" };
const usd = (n: number | null) => n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(n);

export const systemStatusQuery = { queryKey: ["system-status"], queryFn: () => getSystemStatus(), refetchInterval: 60_000, staleTime: 30_000 };

export function useSystemState(): ServiceState | null {
  const { data } = useQuery(systemStatusQuery);
  if (!data) return null;
  return data.services.some((s) => s.state === "down") ? "down" : data.services.some((s) => s.state === "degraded") ? "degraded" : "up";
}

export function StatusDot({ state }: { state: ServiceState | null }) {
  return <span className="relative inline-flex h-2.5 w-2.5">{state === "up" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />}<span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${state ? DOT[state] : "bg-muted-foreground"}`} /></span>;
}

const SERVICE_ICON: Record<string, string> = {
  network: "/tokens/sol.svg", vaults: "/brands/meteora.svg", predict: "/tokens/jup.png",
  markets: "/brands/polymarket-mark.svg", wallets: "/brands/privy-mark.png", funding: "/brands/coinbase.svg",
};

function Metric({ label, hint, value, featured, wide }: { label: string; hint: string; value: string; featured?: boolean; wide?: boolean }) {
  const t = useT();
  return <div className={`rounded-xl border p-4 transition-colors hover:border-primary/40 ${wide ? "sm:col-span-2" : ""} ${featured ? "border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card" : "border-border bg-card"}`}>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t(label)}</p>
    <p className={`mt-2 font-display font-extrabold tracking-tight text-foreground ${featured ? "text-3xl" : "text-2xl"}`}>{value}</p>
    <p className="mt-1 text-[11px] text-muted-foreground">{t(hint)}</p>
  </div>;
}

function Provider({ title, by, logo, rows }: { title: string; by: string; logo: string; rows: [string, string, number | null][] }) {
  const t = useT();
  return <section className="rounded-2xl border border-border bg-card/50 p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-display text-lg font-semibold text-foreground">{t(title)}</h2>
      <span className="flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground">Powered by<img src={logo} alt="" className="h-4 w-4 rounded-full" loading="lazy" /><span className="font-semibold text-foreground">{by}</span></span>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">{rows.map(([l, h, v], i) => <Metric key={l} label={l} hint={h} value={usd(v)} featured={i === 0} wide={i === 0 && rows.length % 2 === 1} />)}</div>
  </section>;
}

export function SystemStatusView() {
  const t = useT();
  const { data, isError, isLoading } = useQuery(systemStatusQuery);
  const overall = useSystemState();
  const headline = isLoading ? t("Comprobando servicios…") : isError || !overall ? t("No pudimos comprobar el estado. Reintentando…") : overall === "up" ? t("Todos los sistemas operativos") : overall === "degraded" ? t("Algunos servicios responden lento") : t("Algunos servicios presentan fallas");
  const stateText: Record<ServiceState, string> = { up: t("Operativo"), degraded: t("Lento"), down: t("Sin respuesta") };
  const m: GlobalMetric | undefined = data?.meteora, p: GlobalMetric | undefined = data?.polymarket;
  return <div className="space-y-6 text-foreground">
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5"><StatusDot state={overall} /><div><p className="font-display text-xl font-bold">{headline}</p>{data && <p className="text-xs text-muted-foreground">{t("Última comprobación")}: {new Date(data.checkedAt).toLocaleTimeString()} · {t("se actualiza cada minuto")}</p>}</div></div>
    <section><h2 className="mb-3 font-display text-lg font-semibold">{t("Servicios")}</h2><ul className="divide-y divide-border rounded-2xl border border-border bg-card">{(data?.services ?? Object.keys(SERVICE_LABEL).map((id) => ({ id, state: null as ServiceState | null, ms: null }))).map((s) => <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-3"><StatusDot state={s.state} />{SERVICE_ICON[s.id] && <img src={SERVICE_ICON[s.id]} alt="" className="h-5 w-5 rounded-full" loading="lazy" />}{t(SERVICE_LABEL[s.id] ?? s.id)}</span><span className="text-muted-foreground">{s.state ? stateText[s.state] : "…"}{s.ms != null && ` · ${s.ms} ms`}</span></li>)}</ul></section>
    <Provider title="Bóvedas de liquidez · global" by="Meteora" logo="/brands/meteora.svg" rows={[["Liquidez total depositada", "En contratos inteligentes", m?.tvl ?? null], ["Comisiones pagadas (24h)", "Repartidas a proveedores de liquidez", m?.fees24h ?? null], ["Comisiones pagadas (histórico)", "Desde el lanzamiento", m?.feesAll ?? null]]} />
    <Provider title="Mercados de predicción · global" by="Polymarket" logo="/brands/polymarket-mark.svg" rows={[["Interés abierto", "Dinero en predicciones abiertas ahora", p?.openInterest ?? null], ["Fondos depositados", "En contratos inteligentes", p?.tvl ?? null], ["Volumen negociado (24h)", "Últimas 24 horas", p?.volume24h ?? null], ["Volumen negociado (histórico)", "Desde el lanzamiento", p?.volumeAll ?? null]]} />
    <p className="text-xs leading-5 text-muted-foreground">{t("Las cifras globales son datos públicos de cada protocolo (vía DefiLlama), no fondos de BÓVEDA ni de sus usuarios. Un dato no disponible se muestra como —. Estos protocolos no publican un conteo de usuarios conectados en vivo; el interés abierto refleja la participación activa.")}</p>
  </div>;
}
