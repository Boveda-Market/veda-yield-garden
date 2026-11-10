import { useEffect, useState } from "react";
import { Download, Share, PlusSquare } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: PromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as PromptEvent; });
}

export function InstallAppButton({ className }: { className: string }) {
  const t = useT();
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState<null | "ios" | "other">(null);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    const done = () => setInstalled(true);
    window.addEventListener("appinstalled", done);
    return () => window.removeEventListener("appinstalled", done);
  }, []);
  if (installed) return null;
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
  return <>
    <button type="button" className={className} onClick={install}><Download size={18} />{t("Instalar app")}</button>
    <Dialog open={help !== null} onOpenChange={(o) => !o && setHelp(null)}>
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
    </Dialog>
  </>;
}
