import { useEffect, useId, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionSuccess } from "@/components/action-success";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import { createPluginWallet, getJupiterPlugin, loadJupiterPlugin } from "@/lib/jupiter-plugin";
import { swapToken } from "@/lib/wallet-actions";
import pluginTheme from "@/components/jupiter-theme.css?inline";

export default function JupiterSwap({ initialFrom, initialAmount, onBusyChange, onReadyChange, onSuccess }: {
  initialFrom: string; initialAmount: string;
  onBusyChange: (busy: boolean) => void; onReadyChange: (ready: boolean) => void; onSuccess: () => void;
}) {
  const t = useT();
  const session = useBovedaSession();
  const current = useRef(session); current.current = session;
  const callbacks = useRef({ onBusyChange, onReadyChange, onSuccess }); callbacks.current = { onBusyChange, onReadyChange, onSuccess };
  const id = `jupiter-swap-${useId().replace(/:/g, "")}`;
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let teardown: (() => void) | undefined;
    setLoaded(false); setError(false);
    void loadJupiterPlugin().then(async (plugin) => {
      if (!active) return;
      await plugin.init({
        displayMode: "integrated", integratedTargetId: id,
        enableWalletPassthrough: true, passthroughWalletContextState: createPluginWallet(() => current.current),
        onRequestConnectWallet: () => current.current.login("google"),
        formProps: { initialInputMint: swapToken(initialFrom).mint, initialOutputMint: swapToken(initialFrom === "USDC" ? "SOL" : "USDC").mint,
          ...(initialAmount ? { initialAmount } : {}) },
        containerStyles: { width: "100%", height: `${document.getElementById(id)?.clientHeight ?? 450}px`, borderRadius: "8px", overflow: "auto" },
        containerClassName: "boveda-jupiter-shell",
        onFormUpdate: (form) => { if (active) callbacks.current.onReadyChange(Number(form.fromValue) > 0); },
        onScreenUpdate: (screen) => { if (active) callbacks.current.onBusyChange(screen === "Swapping"); },
        onSuccess: ({ txid }) => {
          if (!active || !/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(txid)) return;
          callbacks.current.onBusyChange(false); callbacks.current.onReadyChange(false);
          setSignature(txid); callbacks.current.onSuccess();
        },
      });
      teardown = () => { plugin.close(); const root = plugin.root; queueMicrotask(() => root?.unmount()); };
      if (!active) { teardown(); return; }
      setLoaded(true);
    }).catch(() => { if (active) setError(true); });
    const themeTimer = setInterval(() => {
      const shadow = document.getElementById(id)?.querySelector("#jupiter-plugin-instance > div")?.shadowRoot;
      if (!shadow || shadow.getElementById("boveda-jupiter-theme")) return;
      const style = document.createElement("style"); style.id = "boveda-jupiter-theme"; style.textContent = pluginTheme; shadow.appendChild(style);
    }, 100);
    // The official renderer loads independently; show a recoverable error instead of a blank frame.
    const timer = setTimeout(() => {
      const host = document.getElementById(id);
      const shadow = host?.querySelector("#jupiter-plugin-instance > div")?.shadowRoot;
      if (active && !shadow?.querySelector("input,button")) setError(true);
    }, 25_000);
    return () => { active = false; clearTimeout(timer); clearInterval(themeTimer); teardown?.(); callbacks.current.onReadyChange(false); callbacks.current.onBusyChange(false); };
  }, [id, initialFrom, initialAmount, attempt]);

  useEffect(() => { if (loaded) getJupiterPlugin()?.syncProps({ passthroughWalletContextState: createPluginWallet(() => current.current) }); }, [loaded, session.walletAddress, session.authenticated, session.tradeBlock]);

  return <div className="min-w-0 space-y-2">
    {signature ? <ActionSuccess destination={null} title={t("Cambio realizado")} body={t("Tu saldo se actualizará en unos segundos.")}
      details={[{ label: t("Operación"), value: t("Cambio de moneda") }, { label: t("Servicio Bóveda Market"), value: "$0" }, { label: t("Destino"), value: t("Tu billetera") }]}
      signature={signature} doneLabel={t("Hacer otro cambio")} onClose={() => { setSignature(null); setAttempt((n) => n + 1); }} /> : <>
      {!loaded && !error && <p role="status" className="text-center text-sm text-muted-foreground">{t("Cargando Jupiter…")}</p>}
      {error && <div className="space-y-2" role="alert"><p className="text-sm text-muted-foreground">{t("Jupiter no está disponible. Inténtalo de nuevo.")}</p>
        <Button variant="outline" className="w-full" onClick={() => setAttempt((n) => n + 1)}><RefreshCw />{t("Reintentar")}</Button></div>}
      <p className="text-xs text-muted-foreground">{t("Bóveda Market no añade comisión. Jupiter y el mercado pueden aplicar costos; revísalos antes de confirmar.")}</p>
    </>}
    <div id={id} className={`jupiter-swap-host ${signature || error ? "hidden" : ""}`} aria-label="Jupiter" />
  </div>;
}