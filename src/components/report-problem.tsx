import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Send } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { submitSuggestion } from "@/lib/suggestions.functions";
import { SUGGESTION_MAX_CHARS } from "@/lib/suggestions";

const TYPES = ["Depósito o compra de USDC", "Retiro o envío de fondos", "Bóvedas o cosecha de ganancias", "Fallo visual o error en la app", "Otro inconveniente"] as const;
const TELEGRAM = "https://t.me/bovedamarket";

/** Wallet-page problem report: stored as an "error" suggestion and alerted to the operator. Pass `trigger` to render a compact opener instead of the full card. */
export function ReportProblem({ trigger }: { trigger?: (open: () => void) => ReactNode }) {
  const t = useT();
  const session = useBovedaSession();
  const send = useServerFn(submitSuggestion);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof TYPES)[number]>(TYPES[0]);
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const device = typeof navigator !== "undefined" ? (/Mobi|Android|iPhone/i.test(navigator.userAgent) ? "móvil" : "escritorio") : "";
  const header = `[${type}] [${device}]${contact.trim() ? ` [contacto: ${contact.trim()}]` : ""}\n`;
  const max = Math.max(10, SUGGESTION_MAX_CHARS - header.length);
  async function submit() {
    if (text.trim().length < 10 || busy) return;
    setBusy(true); setMsg("");
    try {
      const r = await send({ data: { category: "error", message: (header + text.trim()).slice(0, SUGGESTION_MAX_CHARS), wallet: session.walletAddress ?? null } });
      if (r.success) { setDone(true); setText(""); setContact(""); } else setMsg(t(r.error));
    } catch { setMsg(t("No se pudo enviar el reporte.")); } finally { setBusy(false); }
  }
  const openDialog = () => { setOpen(true); setDone(false); setMsg(""); };
  const dialog = <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("Reportar un problema")}</DialogTitle></DialogHeader>
        {done ? <div className="space-y-3">
          <p role="status" className="text-sm">{t("¡Recibido! El equipo revisará tu reporte lo antes posible.")}</p>
          <Button asChild variant="outline" className="w-full"><a href={TELEGRAM} target="_blank" rel="noopener noreferrer">{t("¿Es urgente? Escríbenos en Telegram ↗")}</a></Button>
          <Button className="w-full" onClick={() => setOpen(false)}>{t("Cerrar")}</Button>
        </div> : <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="flex flex-wrap gap-2">{TYPES.map((c) => <Button key={c} type="button" size="sm" variant={type === c ? "default" : "outline"} aria-pressed={type === c} onClick={() => setType(c)}>{t(c)}</Button>)}</div>
          <textarea value={text} maxLength={max} onChange={(e) => setText(e.target.value)} rows={4} placeholder={t("Cuéntanos qué pasó…")} aria-label={t("Descripción del problema")} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <Input value={contact} maxLength={80} onChange={(e) => setContact(e.target.value)} placeholder={t("Telegram o correo para responderte (opcional)")} aria-label={t("Contacto opcional")} />
          <p className="text-xs text-muted-foreground">{t("Adjuntamos tu dirección pública y tipo de dispositivo. Nunca te pediremos claves ni códigos.")}</p>
          <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{text.length}/{max}</span><Button type="submit" disabled={busy || text.trim().length < 10}><Send size={16} />{busy ? t("Enviando…") : t("Enviar reporte")}</Button></div>
          {msg && <p role="status" className="text-sm text-destructive">{msg}</p>}
        </form>}
      </DialogContent>
    </Dialog>;
  if (trigger) return <>{trigger(openDialog)}{dialog}</>;
  return <section className="rounded-2xl border border-border bg-card p-5">
    <h3 className="flex items-center gap-2 font-display text-lg"><LifeBuoy size={18} className="text-primary" />{t("¿Tuviste un problema con tu cuenta o una transacción?")}</h3>
    <p className="mt-1 text-sm text-muted-foreground">{t("Cuéntanos qué pasó y el equipo lo revisa directamente.")}</p>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button onClick={openDialog}><LifeBuoy size={16} />{t("Reportar un problema")}</Button>
      <a href={TELEGRAM} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">{t("¿Es urgente? Escríbenos en Telegram ↗")}</a>
    </div>
    {dialog}
  </section>;
}
