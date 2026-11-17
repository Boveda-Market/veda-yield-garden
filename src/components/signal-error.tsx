import { ShieldCheck } from "lucide-react";
import { useT } from "@/lib/i18n";

export type SignalKind = "network" | "cancel" | "busy";

/** Picks the friendly scenario from the raw message: cancelled approval, network busy/rejected, or slow connection. */
export function signalKind(message: string): SignalKind {
  const m = message.toLowerCase();
  if (/cancel|rechaz(aste|ó la firma)|user rejected|denied/.test(m)) return "cancel";
  if (/rechaz|precio|movería|ocupad|congest|tráfico|slippage|minutos/.test(m)) return "busy";
  return "network";
}

/** Calm, animated, slightly funny notice for failures: money is safe first, then "check your Wi-Fi/signal". */
export function SignalErrorCard({ message, kind, className = "" }: { message?: string | null | undefined; kind?: SignalKind; className?: string }) {
  const t = useT();
  const k = kind ?? signalKind(message ?? "");
  const copy = {
    network: { icon: "📡", title: t("Parece que el internet tuvo un hipo (o la antena se fue a tomar un café ☕)"), body: t("La confirmación no alcanzó a pasar a tiempo. Échale un ojo a tu Wi-Fi o datos móviles y dale otro toque.") },
    cancel: { icon: "📶", title: t("¿Te quedaste sin señal o te entró una llamada?"), body: t("La aprobación no se completó. Cuando tengas buena señal, puedes reanudar.") },
    busy: { icon: "🚦", title: t("Hora pico en la autopista digital"), body: t("Hubo mucho tráfico en este momento y la operación se pausó para protegerte. Espera unos segundos y vuelve a intentar.") },
  }[k];
  return <div role="alert" className={`signal-pop grid gap-2 rounded-2xl border border-border/80 bg-secondary/60 p-4 text-sm ${className}`}>
    <div className="flex items-start gap-3">
      <div aria-hidden className="relative grid size-11 shrink-0 place-items-center">
        <span className="signal-wave absolute inset-0 rounded-full bg-primary/20" />
        <span className="signal-wave absolute inset-0 rounded-full bg-primary/15 [animation-delay:0.6s]" />
        <span className="relative text-xl">{copy.icon}</span>
      </div>
      <div className="min-w-0">
        <p className="font-semibold leading-5 text-foreground">{copy.title}</p>
        <p className="mt-1 leading-5 text-muted-foreground">{copy.body}</p>
      </div>
      <div aria-hidden className="ml-auto flex h-5 shrink-0 items-end gap-0.5">
        {[0, 1, 2, 3].map((i) => <span key={i} className="signal-bar w-1 rounded-sm bg-primary/70" style={{ height: `${(i + 1) * 25}%`, animationDelay: `${i * 0.15}s` }} />)}
      </div>
    </div>
    <p className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-foreground"><ShieldCheck size={14} className="shrink-0 text-primary" />{t("Tus dólares están seguros. No se cobró nada.")}</p>
    {message && <p className="text-[11px] leading-4 text-muted-foreground/80">{message}</p>}
  </div>;
}
