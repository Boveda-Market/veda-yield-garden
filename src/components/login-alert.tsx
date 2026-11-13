import { AlertTriangle } from "lucide-react";
import { Dismissible } from "@/components/dismissible";
import { useT } from "@/lib/i18n";

/** Sign-in error card: icon, ✕ close and auto-dismiss (paused on touch/hover). */
export function LoginAlert({ message, onDismiss, className = "" }: { message: string; onDismiss: () => void; className?: string }) {
  const t = useT();
  return <Dismissible key={message} ms={7000} onDismiss={onDismiss} className={`rounded-xl border border-destructive/25 bg-destructive/10 text-destructive animate-in fade-in slide-in-from-top-1 duration-200 ${className}`}>
    <div role="alert" className="flex items-start gap-2 px-4 py-3 pr-11 text-sm leading-5"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{t(message)}</div>
  </Dismissible>;
}
