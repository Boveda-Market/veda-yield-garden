import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { sendTelegramTest, setTelegramAlertKind, setTelegramAlerts, startTelegramLink, telegramLinkStatus, type TelegramLinkStatus } from "@/lib/telegram-alerts.functions";
import { ALERT_KINDS, ALERT_LABEL, toggleMuted, type AlertKind } from "@/lib/alert-kinds";

/** Personal account alerts through the official bot; linking uses a one-time deep link. */
export function TelegramAlerts({ onLinkedChange }: { onLinkedChange?: (linked: boolean) => void } = {}) {
  const t = useT();
  const session = useBovedaSession();
  const status = useServerFn(telegramLinkStatus), start = useServerFn(startTelegramLink), set = useServerFn(setTelegramAlerts);
  const [s, setS] = useState<TelegramLinkStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const setKind = useServerFn(setTelegramAlertKind), test = useServerFn(sendTelegramTest);
  const [testState, setTestState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const refresh = async () => { const token = await session.getAccessToken?.(); if (token) setS(await status({ data: { token } })); };
  useEffect(() => { if (session.authenticated) void refresh().catch(() => undefined); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [session.authenticated]);
  useEffect(() => {
    if (!waiting || s?.linked) { if (s?.linked) setWaiting(false); return; }
    let n = 0; const id = setInterval(() => { if (++n > 40) { clearInterval(id); setWaiting(false); } void refresh().catch(() => undefined); }, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, s?.linked]);
  useEffect(() => { if (s) onLinkedChange?.(s.linked); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [s?.linked]);
  // Re-check when returning to the tab so a disconnect made in Telegram brings the invite card back.
  useEffect(() => {
    if (!session.authenticated) return;
    const onVis = () => { if (document.visibilityState === "visible") void refresh().catch(() => undefined); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.authenticated]);
  if (!session.authenticated || !s) return null;
  const connect = async () => {
    const tab = window.open("", "_blank");
    setBusy(true);
    try { const token = await session.getAccessToken?.(); const r = token ? await start({ data: { token } }) : { success: false };
      if (r.success && "url" in r && r.url) { if (tab) tab.location.href = r.url; else window.location.href = r.url; setWaiting(true); } else tab?.close();
    } finally { setBusy(false); }
  };
  const act = async (action: "on" | "off" | "unlink") => { setBusy(true); try { const token = await session.getAccessToken?.(); if (token) await set({ data: { token, action } }); await refresh(); } finally { setBusy(false); } };
  const toggleKind = async (kind: AlertKind, on: boolean) => {
    const prev = s; setS({ ...s, muted: toggleMuted(s.muted, kind, on) });
    try { const token = await session.getAccessToken?.(); const r = token ? await setKind({ data: { token, kind, on } }) : { success: false }; if (!r.success) setS(prev); } catch { setS(prev); }
  };
  const sendTest = async () => {
    setTestState("sending");
    try { const token = await session.getAccessToken?.(); const r = token ? await test({ data: { token } }) : { success: false }; setTestState(r.success ? "sent" : "failed"); } catch { setTestState("failed"); }
  };
  return <section className="mb-4 rounded-2xl border border-border bg-card p-4">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Send size={18} /></span>
      <div className="flex-1">
        <h3 className="font-semibold">{t("Avisos de tu cuenta en Telegram")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{s.linked ? `${t("Conectado")}${s.username ? ` · @${s.username}` : ""}` : t("Recibe un mensaje privado con tus cosechas, ganancias de Sube/Baja, retiros y comisiones de invitados.")}</p>
      </div>
    </div>
    {s.linked ? <div className="mt-3 space-y-3">
      <label className="flex items-center justify-between text-sm font-medium"><span>{t("Recibir avisos")}</span><Switch checked={s.enabled} disabled={busy} onCheckedChange={(v) => void act(v ? "on" : "off")} /></label>
      <fieldset disabled={!s.enabled || busy} className="space-y-2 rounded-xl border border-border p-3 disabled:opacity-50">
        <legend className="px-1 text-xs text-muted-foreground">{t("Elige qué avisos recibir")}</legend>
        {ALERT_KINDS.map((k) => <label key={k} className="flex items-center justify-between text-sm"><span>{t(ALERT_LABEL[k])}</span><Switch checked={!s.muted.includes(k)} disabled={!s.enabled || busy} onCheckedChange={(v) => void toggleKind(k, v)} aria-label={t(ALERT_LABEL[k])} /></label>)}
      </fieldset>
      <Button variant="secondary" size="sm" className="w-full" disabled={testState === "sending"} onClick={() => void sendTest()}>{testState === "sent" ? <CheckCircle2 size={16} /> : <Send size={16} />}{testState === "sending" ? t("Enviando…") : t("Enviar aviso de prueba")}</Button>
      {testState === "sent" && <p role="status" className="text-xs text-primary">{t("Listo: revisa tu chat con @bovedamarketbot.")}</p>}
      {testState === "failed" && <p role="alert" className="text-xs text-destructive">{t("No pudimos enviar el aviso. Vuelve a conectar Telegram e inténtalo de nuevo.")}</p>}
      <Button variant="outline" size="sm" className="w-full" disabled={busy} onClick={() => void act("unlink")}>{t("Desconectar Telegram")}</Button>
    </div> : <>
      <Button className="mt-3 w-full" disabled={busy} onClick={() => void connect()}>{waiting ? t("Esperando confirmación en Telegram…") : t("Conectar Telegram")}</Button>
      <p className="mt-2 text-xs text-muted-foreground">{t("Se abrirá el bot oficial @bovedamarketbot: solo toca «Iniciar». No compartimos tu número.")}</p>
    </>}
  </section>;
}
