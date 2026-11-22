import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import { getAffiliateDashboard } from "@/lib/affiliate.functions";

/** Shares a win with the user's own affiliate link (falls back to the plain site link). */
export function ShareWin({ headline }: { headline: string }) {
  const t = useT();
  const session = useBovedaSession();
  const load = useServerFn(getAffiliateDashboard);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    let url = window.location.origin;
    try {
      const token = session.authenticated ? await session.getAccessToken?.() : null;
      if (token) { const r = await load({ data: { token } }); if (r.success) url = `${url}/?ref=${r.dashboard.code}`; }
    } catch { /* plain link */ }
    const text = `${headline} — ${t("Predice el mercado conmigo en Bóveda Market")}`;
    try {
      if (navigator.share) { await navigator.share({ title: "Bóveda Market", text, url }); return; }
    } catch { return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-center">
      <p className="font-display text-2xl font-bold text-primary">{headline}</p>
      <Button variant="secondary" className="mt-3 w-full" onClick={share}>{copied ? <><Check size={16} />{t("Enlace copiado")}</> : <><Share2 size={16} />{t("Compartir con amigos")}</>}</Button>
      <p className="mt-2 text-xs text-muted-foreground">{t("Incluye tu enlace de invitación si ya eres afiliado.")}</p>
    </div>
  );
}
