import { toast } from "sonner";
import { AlertCircle, BellRing, CheckCircle2, Info, ShieldCheck, type LucideIcon } from "lucide-react";

/**
 * Floating "pill" notifications (Cash App / Robinhood style): one calm capsule at the top,
 * auto-hides after ~6s (errors 8s), swipe or tap to dismiss. Pass already-translated text.
 */
export type NotifyTone = "success" | "secure" | "round" | "info" | "error";

const ICON: Record<NotifyTone, LucideIcon> = { success: CheckCircle2, secure: ShieldCheck, round: BellRing, info: Info, error: AlertCircle };
const ICON_CLASS: Record<NotifyTone, string> = {
  success: "bg-primary/15 text-primary",
  secure: "bg-primary/15 text-primary",
  round: "bg-accent text-accent-foreground",
  info: "bg-muted text-muted-foreground",
  error: "bg-secondary text-foreground",
};

export function notify(tone: NotifyTone, title: string, description?: string) {
  const Icon = ICON[tone];
  return toast.custom((id) => (
    <button type="button" onClick={() => toast.dismiss(id)} aria-label={description ? `${title}. ${description}` : title}
      className="mx-auto flex w-full max-w-[min(92vw,380px)] items-center gap-3 rounded-full border-2 border-primary/60 bg-popover py-3 pl-2.5 pr-6 ring-4 ring-primary/15 animate-in fade-in zoom-in-95 text-left text-popover-foreground shadow-2xl backdrop-blur-md transition-transform active:scale-[0.98]">
      <span className={`grid size-11 shrink-0 place-items-center rounded-full ${ICON_CLASS[tone]}`}><Icon className="size-6" aria-hidden /></span>
      <span className="min-w-0">
        <span className="block truncate text-base font-bold">{title}</span>
        {description && <span className="block truncate text-sm text-popover-foreground/80">{description}</span>}
      </span>
    </button>
  ), { duration: tone === "error" ? 8000 : 6000 });
}
