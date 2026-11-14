import { toast } from "sonner";
import { AlertCircle, BellRing, CheckCircle2, Info, ShieldCheck, type LucideIcon } from "lucide-react";

/**
 * Floating "pill" notifications (Cash App / Robinhood style): one calm capsule at the top,
 * auto-hides after ~3s (errors 6s), swipe or tap to dismiss. Pass already-translated text.
 */
export type NotifyTone = "success" | "secure" | "round" | "info" | "error";

const ICON: Record<NotifyTone, LucideIcon> = { success: CheckCircle2, secure: ShieldCheck, round: BellRing, info: Info, error: AlertCircle };
const ICON_CLASS: Record<NotifyTone, string> = {
  success: "bg-primary/15 text-primary",
  secure: "bg-primary/15 text-primary",
  round: "bg-accent text-accent-foreground",
  info: "bg-muted text-muted-foreground",
  error: "bg-destructive/15 text-destructive",
};

export function notify(tone: NotifyTone, title: string, description?: string) {
  const Icon = ICON[tone];
  return toast.custom((id) => (
    <button type="button" onClick={() => toast.dismiss(id)} aria-label={description ? `${title}. ${description}` : title}
      className="mx-auto flex w-full max-w-[min(92vw,380px)] items-center gap-3 rounded-full border border-border bg-popover/95 py-2 pl-2 pr-5 text-left text-popover-foreground shadow-lg backdrop-blur-md transition-transform active:scale-[0.98]">
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${ICON_CLASS[tone]}`}><Icon className="size-[18px]" aria-hidden /></span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {description && <span className="block truncate text-xs text-muted-foreground">{description}</span>}
      </span>
    </button>
  ), { duration: tone === "error" ? 6000 : 3200 });
}
