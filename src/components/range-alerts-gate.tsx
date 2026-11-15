import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { setTelegramAlertKind, setTelegramAlerts, startTelegramLink, telegramLinkStatus, type TelegramLinkStatus } from "@/lib/telegram-alerts.functions";

/** Range vaults only earn when rebalanced on time: make sure Telegram range alerts are on, in one tap. */
export function RangeAlertsGate() {
  const t = useT();
  const session = useBovedaSession();
  const status = useServerFn(telegramLinkStatus), start = useServerFn(startTelegramLink), set = useServerFn(setTelegramAlerts), setKind = useServerFn(setTelegramAlertKind);
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
  const enable = async () => {
    setBusy(true);
    try { const token = await session.getAccessToken?.(); if (token) { if (!s.enabled) await set({ data: { token, action: "on" } }); if (s.muted.includes("range")) await setKind({ data: { token, kind: "range", on: true } }); } await refresh(); } finally { setBusy(false); }
  };
  if (s.linked && s.enabled && !s.muted.includes("range")) return <p role="status" className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm font-medium text-primary"><CheckCircle2 size={16} className="shrink-0" />{t("Alertas de Telegram activas · Te avisaremos al instante si toca rebalancear.")}</p>;
  if (s.linked) return <div className="grid gap-2 rounded-xl border border-border bg-muted p-3 text-sm"><p className="font-semibold">⚠️ {t("Tus alertas de rebalanceo están en pausa.")}</p><Button size="sm" disabled={busy} onClick={() => void enable()}><BellRing size={16} />{t("Activar en 1 toque")}</Button></div>;
  return <div className="grid gap-2 rounded-xl border-2 border-primary/60 bg-primary/10 p-3 text-sm">
    <p className="font-display text-base font-bold">📲 {t("Activa tus alertas de rebalanceo")}</p>
    <p className="text-muted-foreground">{t("Esta bóveda exige reflejos: cuando el mercado se mueve, te avisamos para volver a centrar tu dinero en 1 firma.")}</p>
    <Button disabled={busy} onClick={() => void connect()}><Send size={16} />{waiting ? t("Esperando confirmación en Telegram…") : t("Conectar Telegram ahora")}</Button>
    <p className="text-xs text-muted-foreground">👉 {t("En Telegram toca «Iniciar» y deja el chat sin silenciar para que los avisos te lleguen con sonido.")}</p>
  </div>;
}
