import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { setTelegramAlerts, startTelegramLink, telegramLinkStatus, type TelegramLinkStatus } from "@/lib/telegram-alerts.functions";

/** Personal account alerts through the official bot; linking uses a one-time deep link. */
export function TelegramAlerts() {
  const t = useT();
  const session = useBovedaSession();
  const status = useServerFn(telegramLinkStatus), start = useServerFn(startTelegramLink), set = useServerFn(setTelegramAlerts);
  const [s, setS] = useState<TelegramLinkStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const refresh = async () => { const token = await session.getAccessToken?.(); if (token) setS(await status({ data: { token } })); };
  useEffect(() => { if (session.authenticated) void refresh().catch(() => undefined); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [session.authenticated]);
  useEffect(() => {
    if (!waiting || s?.linked) { if (s?.linked) setWaiting(false); return; }
    let n = 0; const id = setInterval(() => { if (++n > 40) { clearInterval(id); setWaiting(false); } void refresh().catch(() => undefined); }, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, s?.linked]);
  if (!session.authenticated || !s) return null;
  const connect = async () => {
    const tab = window.open("", "_blank");
    setBusy(true);
    try { const token = await session.getAccessToken?.(); const r = token ? await start({ data: { token } }) : { success: false };
      if (r.success && "url" in r && r.url) { if (tab) tab.location.href = r.url; else window.location.href = r.url; setWaiting(true); } else tab?.close();
    } finally { setBusy(false); }
  };
  const act = async (action: "on" | "off" | "unlink") => { setBusy(true); try { const token = await session.getAccessToken?.(); if (token) await set({ data: { token, action } }); await refresh(); } finally { setBusy(false); } };
  return <section className="mb-4 rounded-2xl border border-border bg-card p-4">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Send size={18} /></span>
      <div className="flex-1">
        <h2 className="font-semibold">{t("Avisos de tu cuenta en Telegram")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{s.linked ? `${t("Conectado")}${s.username ? ` · @${s.username}` : ""}` : t("Recibe un mensaje privado con tus cosechas, ganancias de Sube/Baja, retiros y comisiones de invitados.")}</p>
      </div>
    </div>
    {s.linked ? <div className="mt-3 space-y-3">
      <label className="flex items-center justify-between text-sm"><span>{t("Recibir avisos")}</span><Switch checked={s.enabled} disabled={busy} onCheckedChange={(v) => void act(v ? "on" : "off")} /></label>
      <Button variant="outline" size="sm" className="w-full" disabled={busy} onClick={() => void act("unlink")}>{t("Desconectar Telegram")}</Button>
    </div> : <>
      <Button className="mt-3 w-full" disabled={busy} onClick={() => void connect()}>{waiting ? t("Esperando confirmación en Telegram…") : t("Conectar Telegram")}</Button>
      <p className="mt-2 text-xs text-muted-foreground">{t("Se abrirá el bot oficial @bovedamarketbot: solo toca «Iniciar». No compartimos tu número.")}</p>
    </>}
  </section>;
}
