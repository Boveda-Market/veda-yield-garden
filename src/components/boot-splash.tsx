import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { Button } from "./ui/button";

const STEPS = ["Conectando red…", "Verificando acceso seguro…", "Sincronizando billetera…"] as const;
export const UPDATING_FLAG = "boveda-chunk-reload";
const BOOT_RETRY_FLAG = "boveda-boot-retry";

/** One full-screen animated loading screen that covers every startup step, so the phone never flickers between screens. */
export function BootSplash() {
  const t = useT();
  const [step, setStep] = useState(0);
  const [slow, setSlow] = useState(false);
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    try { const at = Number(sessionStorage.getItem(UPDATING_FLAG) || 0); setUpdating(Date.now() - at < 30000); } catch { /* ignore */ }
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1100);
    // Phones on slow data sometimes stall loading the secure-access files; a fresh load always works,
    // so retry once by itself before ever showing the "taking longer" notice.
    const retryId = setTimeout(() => {
      try { const last = Number(sessionStorage.getItem(BOOT_RETRY_FLAG) || 0); if (Date.now() - last > 60000) { sessionStorage.setItem(BOOT_RETRY_FLAG, String(Date.now())); window.location.reload(); return; } } catch { /* ignore */ }
      setSlow(true);
    }, 10000);
    return () => { clearInterval(id); clearTimeout(retryId); };
  }, []);
  return <div role="status" aria-live="polite" className="fixed inset-0 z-[60] grid place-items-center bg-background px-6 text-foreground">
    <div className="flex max-w-xs flex-col items-center text-center">
      <span className="relative grid size-20 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-3xl bg-primary/20" aria-hidden />
        <img src="/icon-512.png" alt="" className="relative size-16 rounded-2xl shadow-lg" />
      </span>
      <p className="mt-6 font-display text-lg font-bold tracking-wide">BÓVEDA</p>
      <div className="mt-4 flex items-center gap-2" aria-hidden>
        {STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? "w-8 bg-primary" : "w-3 bg-muted"}`} />)}
      </div>
      <p key={updating ? "u" : step} className="mt-4 text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-500">{updating ? t("Actualizando a la última versión…") : t(STEPS[step]!)}</p>
      {slow && <div className="mt-6 animate-in fade-in"><p className="text-xs text-muted-foreground">{t("Está tardando más de lo normal. Revisa tu conexión o desactiva bloqueadores para este sitio.")}</p><div className="mt-3 flex flex-wrap justify-center gap-2"><Button size="sm" onClick={() => window.location.reload()}>{t("Reintentar")}</Button><Button asChild size="sm" variant="outline"><Link to="/">{t("Ir al inicio")}</Link></Button></div></div>}
    </div>
  </div>;
}
