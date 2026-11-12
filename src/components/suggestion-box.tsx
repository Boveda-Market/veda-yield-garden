import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb, Send } from "lucide-react";
import { Button } from "./ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { CATEGORY_LABEL, SUGGESTION_CATEGORIES, SUGGESTION_MAX_CHARS, type SuggestionCategory } from "@/lib/suggestions";
import { submitSuggestion } from "@/lib/suggestions.functions";

export function SuggestionBox({ className }: { className: string }) {
  const t = useT();
  const session = useBovedaSession();
  const send = useServerFn(submitSuggestion);
  const [category, setCategory] = useState<SuggestionCategory>("idea");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function submit() {
    if (text.trim().length < 3 || busy) return;
    setBusy(true); setMsg("");
    try {
      const r = await send({ data: { category, message: text.trim(), wallet: session.walletAddress ?? null } });
      if (r.success) { setText(""); setMsg(t("¡Gracias! Tu sugerencia fue enviada al equipo.")); } else setMsg(t(r.error));
    } catch { setMsg(t("No se pudo enviar la sugerencia.")); } finally { setBusy(false); }
  }
  return <div className={className}>
    <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Lightbulb size={20} className="text-primary" />{t("Buzón de sugerencias")}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{t("Cuéntanos qué mejorarías. Lo lee directamente el equipo.")}</p>
    <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="flex flex-wrap gap-2">{SUGGESTION_CATEGORIES.map((c) => <Button key={c} type="button" size="sm" variant={category === c ? "default" : "outline"} aria-pressed={category === c} onClick={() => setCategory(c)}>{t(CATEGORY_LABEL[c])}</Button>)}</div>
      <textarea value={text} maxLength={SUGGESTION_MAX_CHARS} onChange={(e) => setText(e.target.value)} rows={4} placeholder={t("Escribe tu sugerencia…")} aria-label={t("Tu sugerencia")} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{text.length}/{SUGGESTION_MAX_CHARS}</span><Button type="submit" disabled={busy || text.trim().length < 3}><Send size={16} />{busy ? t("Enviando…") : t("Enviar sugerencia")}</Button></div>
      {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
    </form>
  </div>;
}
