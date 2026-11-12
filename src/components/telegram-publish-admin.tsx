import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_PAYOUT_WALLET } from "@/lib/affiliate";
import { ANNOUNCEMENTS } from "@/lib/announcements";
import { publishAnnouncementToTelegram } from "@/lib/affiliate.functions";

/** Operator-only: publish in-app announcements to the official Telegram channel. Server re-verifies the treasury owner. */
export function TelegramPublishAdmin() {
  const t = useT();
  const session = useBovedaSession();
  const publish = useServerFn(publishAnnouncementToTelegram);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  if (session.walletAddress !== AFFILIATE_PAYOUT_WALLET) return null;
  async function send(id: string) {
    if (!window.confirm(t("¿Publicar este aviso en el canal de Telegram?"))) return;
    setBusy(id);
    try {
      const token = await session.getAccessToken?.(); if (!token) throw new Error();
      const r = await publish({ data: { token, id } });
      setMsg((m) => ({ ...m, [id]: r.success ? t("Publicado en Telegram") : r.error }));
    } catch { setMsg((m) => ({ ...m, [id]: t("No se pudo publicar.") })); }
    setBusy(null);
  }
  return <section className="mt-6 rounded-2xl border border-border bg-card p-5">
    <h2 className="font-display text-lg font-semibold">{t("Canal de Telegram")}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{t("Publica las novedades del app en @bovedaappsupport.")}</p>
    <ul className="mt-4 space-y-2">{ANNOUNCEMENTS.map((a) => <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
      <div className="min-w-0"><p className="truncate text-sm font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.date}{msg[a.id] ? ` · ${msg[a.id]}` : ""}</p></div>
      <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => send(a.id)}><Send size={14} />{busy === a.id ? t("Enviando…") : t("Publicar")}</Button>
    </li>)}</ul>
  </section>;
}
