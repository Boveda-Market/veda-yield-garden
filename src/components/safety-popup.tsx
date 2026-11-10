import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { SafetyNotice } from "@/components/safety-notice";

const KEY = "boveda.safety.seen";
const DURATION = 15000;

/** Shows the anti-scam notice once per sign-in; cleared when the user signs out. */
export function SafetyPopup({ identity, ready }: { identity: string | null; ready: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    try {
      if (!identity) { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); return; }
      if (localStorage.getItem(KEY) === identity) return;
      localStorage.setItem(KEY, identity);
    } catch { /* show anyway */ }
    if (identity) setOpen(true);
  }, [identity, ready]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setOpen(false), DURATION);
    return () => clearTimeout(id);
  }, [open]);

  if (!open) return null;
  return <div role="dialog" aria-live="polite" aria-label={t("Protégete de estafas")} className="fixed inset-x-0 top-3 z-50 mx-auto w-[calc(100%-1.5rem)] max-w-lg animate-in slide-in-from-top-4 fade-in duration-300">
    <div className="relative overflow-hidden rounded-xl shadow-lg">
      <SafetyNotice className="pr-10" />
      <button type="button" onClick={() => setOpen(false)} aria-label={t("Cerrar")} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary"><X size={16} /></button>
      <div className="px-4 pb-3 -mt-1 bg-card"><button type="button" onClick={() => setOpen(false)} className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">{t("Entendido")}</button></div>
      <div className="absolute bottom-0 left-0 h-1 bg-primary origin-left" style={{ width: "100%", animation: `safety-shrink ${DURATION}ms linear forwards` }} />
      <style>{`@keyframes safety-shrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}`}</style>
    </div>
  </div>;
}
