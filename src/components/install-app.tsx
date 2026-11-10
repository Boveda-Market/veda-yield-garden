import { useEffect, useState } from "react";
import { Download, Share, PlusSquare, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: PromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as PromptEvent; });
}

function useInstall() {
  const [installed, setInstalled] = useState(true);
  const [help, setHelp] = useState<null | "ios" | "other">(null);
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const check = () => setInstalled(mq.matches || (navigator as { standalone?: boolean }).standalone === true);
    check();
    const done = () => setInstalled(true);
    window.addEventListener("appinstalled", done);
    mq.addEventListener?.("change", check);
    return () => { window.removeEventListener("appinstalled", done); mq.removeEventListener?.("change", check); };
  }, []);
  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      if (outcome === "accepted") setInstalled(true);
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setHelp(ios ? "ios" : "other");
  };
  return { installed, help, setHelp, install };
}

function InstallHelp({ help, setHelp }: { help: null | "ios" | "other"; setHelp: (v: null) => void }) {
  const t = useT();
  return <Dialog open={help !== null} onOpenChange={(o) => !o && setHelp(null)}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="font-display">{t("Instala BÓVEDA")}</DialogTitle>
        <DialogDescription>{t("Tenla en tu pantalla de inicio y ábrela como cualquier app.")}</DialogDescription>
        {help === "ios" ? (
          <ol className="mt-2 space-y-3 text-sm">
            <li className="flex items-center gap-3"><Share size={18} className="text-primary" />{t("1. Toca el botón Compartir de Safari.")}</li>
            <li className="flex items-center gap-3"><PlusSquare size={18} className="text-primary" />{t("2. Elige «Añadir a pantalla de inicio».")}</li>
          </ol>
        ) : (
          <p className="mt-2 text-sm">{t("Abre el menú de tu navegador (⋮) y elige «Instalar aplicación» o «Agregar a la pantalla principal».")}</p>
        )}
      </DialogContent>
    </Dialog>;
}

export function InstallAppButton({ className }: { className: string }) {
  const t = useT();
  const { installed, help, setHelp, install } = useInstall();
  if (installed) return null;
  return <>
    <button type="button" className={className} onClick={install}><Download size={18} />{t("Instalar app")}</button>
    <InstallHelp help={help} setHelp={setHelp} />
  </>;
}

const DISMISS_KEY = "boveda-install-banner-dismissed";

/** Dismissible card; hidden while running as the installed app, so it returns after uninstall. Dismissal lasts for the browser session. */
export function InstallAppBanner() {
  const t = useT();
  const { installed, help, setHelp, install } = useInstall();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => { setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1"); }, []);
  if (installed || dismissed) return null;
  const close = () => { sessionStorage.setItem(DISMISS_KEY, "1"); setDismissed(true); };
  return <>
    <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Download size={18} /></span>
      <p className="flex-1 text-sm">{t("Instala BÓVEDA en tu pantalla de inicio para abrirla en un toque.")}</p>
      <button type="button" onClick={install} className="rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">{t("Instalar")}</button>
      <button type="button" onClick={close} aria-label={t("Cerrar")} className="rounded-full p-1 text-muted-foreground hover:text-foreground"><X size={16} /></button>
    </div>
    <InstallHelp help={help} setHelp={setHelp} />
  </>;
}
