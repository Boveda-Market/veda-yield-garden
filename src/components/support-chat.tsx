import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { MessageCircleHeart, SendHorizontal } from "lucide-react";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { useI18n } from "@/lib/i18n";
import { askSofia } from "@/lib/support-chat.functions";
import { CHAT_MAX_CHARS, chatWait } from "@/lib/support-chat";

type Turn = { role: "user" | "assistant"; text: string };

const COPY = {
  es: { open: "Hablar con Sofía", title: "Sofía", sub: "Tu guía en Bóveda Market", hello: "¡Hola! Soy Sofía, tu guía en Bóveda Market. Estoy aquí para ayudarte a entender tus bóvedas, cómo mover tus dólares o resolver cualquier duda. ¿En qué te puedo orientar hoy?", ph: "Escribe tu pregunta…", send: "Enviar", typing: "Sofía está escribiendo…", wait: "Has enviado varios mensajes seguidos. Por favor espera {s} segundos antes de tu siguiente consulta para mantener el servicio disponible para todos.", err: "Uy, no pude responder ahora. Inténtalo de nuevo en un momento o escríbenos en el canal oficial de Telegram.", note: "Sofía es una asistente con IA: orienta, no da consejos financieros ni puede hacer cambios en tu cuenta. Nunca compartas tus claves.", chips: ["¿Cómo retiro mis dólares?", "¿Qué es el Piloto Automático?", "¿Dónde está guardado mi dinero?", "¿Por qué hay una comisión al activar?"] },
  en: { open: "Chat with Sophia", title: "Sophia", sub: "Your Bóveda Market guide", hello: "Hi! I'm Sophia, your Bóveda Market guide. I'm here to help you understand your vaults, move your dollars or answer any question. How can I help you today?", ph: "Type your question…", send: "Send", typing: "Sophia is typing…", wait: "You've sent several messages in a row. Please wait {s} seconds before your next question so the service stays available for everyone.", err: "Oops, I couldn't answer right now. Try again in a moment or reach us on the official Telegram channel.", note: "Sophia is an AI assistant: she guides you, doesn't give financial advice and can't change your account. Never share your keys.", chips: ["How do I withdraw my dollars?", "What is Autopilot?", "Where is my money kept?", "Why is there an activation fee?"] },
} as const;

const HIDDEN = ["/admin"];

export function SupportChat() {
  const { lang } = useI18n();
  const c = COPY[lang === "en" ? "en" : "es"];
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const stamps = useRef<number[]>([]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, busy, notice]);
  if (HIDDEN.some((p) => pathname.startsWith(p))) return null;

  const send = async (q: string) => {
    const question = q.trim().slice(0, CHAT_MAX_CHARS);
    if (!question || busy) return;
    const now = Date.now();
    const wait = chatWait(stamps.current, now);
    if (wait > 0) { setNotice(c.wait.replace("{s}", String(Math.ceil(wait / 1000)))); return; }
    stamps.current = [...stamps.current.filter((s) => now - s < 60_000), now];
    setNotice(""); setText("");
    const next = [...msgs, { role: "user" as const, text: question }];
    setMsgs(next); setBusy(true);
    try {
      const r = await askSofia({ data: { lang: lang === "en" ? "en" : "es", messages: next } });
      if (r.ok) setMsgs([...next, { role: "assistant", text: r.text }]);
      else setNotice(r.wait > 0 ? c.wait.replace("{s}", String(Math.ceil(r.wait / 1000))) : c.err);
    } catch { setNotice(c.err); }
    finally { setBusy(false); }
  };

  return <>
    <button type="button" aria-label={c.open} onClick={() => setOpen(true)}
      className="fixed bottom-24 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 sm:bottom-6 sm:right-6">
      <MessageCircleHeart className="h-6 w-6" aria-hidden />
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <ActionSheetContent closeLabel={lang === "en" ? "Close" : "Cerrar"} className="flex max-h-[85dvh] flex-col sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex items-center gap-3 pr-8">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary" aria-hidden>{c.title[0]}</span>
          <div className="min-w-0"><DialogTitle className="text-base">{c.title}</DialogTitle><DialogDescription className="text-xs">{c.sub}</DialogDescription></div>
        </div>
        <div className="flex min-h-[200px] flex-1 flex-col gap-2 overflow-y-auto text-sm" aria-live="polite">
          <Bubble who="assistant">{c.hello}</Bubble>
          {!msgs.length && <div className="flex flex-wrap gap-2 pt-1">{c.chips.map((q) => <button key={q} type="button" onClick={() => send(q)} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted">{q}</button>)}</div>}
          {msgs.map((m, i) => <Bubble key={i} who={m.role}>{m.text}</Bubble>)}
          {busy && <p className="text-xs text-muted-foreground">{c.typing}</p>}
          {notice && <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">{notice}</p>}
          <div ref={end} />
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={CHAT_MAX_CHARS} placeholder={c.ph} aria-label={c.ph}
            className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-base sm:text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={busy || !text.trim()} aria-label={c.send} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
            <SendHorizontal className="h-5 w-5" aria-hidden />
          </button>
        </form>
        <p className="text-[11px] leading-snug text-muted-foreground">{c.note}</p>
      </ActionSheetContent>
    </Dialog>
  </>;
}

function Bubble({ who, children }: { who: Turn["role"]; children: React.ReactNode }) {
  return <div className={who === "user" ? "ml-8 self-end rounded-2xl rounded-br-md bg-primary px-3 py-2 text-primary-foreground" : "mr-8 self-start whitespace-pre-line rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-foreground"}>{children}</div>;
}
