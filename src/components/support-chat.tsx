import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Headset, SendHorizontal, X } from "lucide-react";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { dismissFloatingSofia, useHideSofia } from "@/lib/preferences";
import { OPEN_SOFIA, SOFIA_TOUR_ACTIVE } from "@/lib/sofia-controls";
import { askSofia } from "@/lib/support-chat.functions";
import { CHAT_MAX_CHARS, chatWait } from "@/lib/support-chat";
import { HERO_SLUGS } from "@/lib/hero-variants";

type Turn = { role: "user" | "assistant"; text: string };

const COPY = {
  es: { open: "Pregúntale a Sofía", show: "Pregúntale a Sofía", title: "Sofía", sub: "Tu guía en Bóveda Market", tag: "Guía oficial", hello: "¡Hola! Soy Sofía, tu guía en Bóveda Market. Estoy aquí para ayudarte a entender tus bóvedas, cómo mover tus dólares o resolver cualquier duda. ¿En qué te puedo orientar hoy?", ph: "Escribe tu pregunta…", send: "Enviar", typing: "Sofía está escribiendo…", wait: "Has enviado varios mensajes seguidos. Por favor espera {s} segundos antes de tu siguiente consulta para mantener el servicio disponible para todos.", err: "Uy, no pude responder ahora. Inténtalo de nuevo en un momento o escríbenos en el canal oficial de Telegram.", note: "Sofía es una asistente con IA: orienta, no da consejos financieros ni puede hacer cambios en tu cuenta. Nunca compartas tus claves.", hide: "Ocultar a Sofía", hideNote: "Podrás volver a mostrarla en el pie de la portada, en el menú o en Tu cuenta.", chips: ["¿Cómo retiro mis dólares?", "¿Qué es el Piloto Automático?", "¿Dónde está guardado mi dinero?", "¿Por qué hay una comisión al activar?"] },
  en: { open: "Ask Sophia", show: "Ask Sophia", title: "Sophia", sub: "Your Bóveda Market guide", tag: "Official guide", hello: "Hi! I'm Sophia, your Bóveda Market guide. I'm here to help you understand your vaults, move your dollars or answer any question. How can I help you today?", ph: "Type your question…", send: "Send", typing: "Sophia is typing…", wait: "You've sent several messages in a row. Please wait {s} seconds before your next question so the service stays available for everyone.", err: "Oops, I couldn't answer right now. Try again in a moment or reach us on the official Telegram channel.", note: "Sophia is an AI assistant: she guides you, doesn't give financial advice and can't change your account. Never share your keys.", hide: "Hide Sophia", hideNote: "You can bring her back from the home page footer, the menu or Your account.", chips: ["How do I withdraw my dollars?", "What is Autopilot?", "Where is my money kept?", "Why is there an activation fee?"] },
} as const;

const HIDDEN = ["/admin"];
/** Home versions (ES + EN) and the sign-in screens show no assistant (user request). */
const NO_SOFIA = new Set(["/", "/en", "/acceso", "/en/sign-in", ...HERO_SLUGS.map((s) => `/${s}`),
  ...["clasica", "gta6", "trump", "doble-o-nada", "sin-ansiedad", "bitcoin", "smart-vaults", "bring-your-coins", "compound-interest"].map((s) => `/en/${s}`)]);

/** While Sofía is hidden, the home footer keeps one quiet way to bring her back — no account needed. */
export function SofiaRestore() {
  const { lang } = useI18n();
  const c = COPY[lang === "en" ? "en" : "es"];
  const [hidden] = useHideSofia();
  if (!hidden) return null;
  return <Button variant="ghost" onClick={() => window.dispatchEvent(new Event(OPEN_SOFIA))} className="inline-flex items-center gap-1.5 text-primary underline underline-offset-4">
    <Headset size={12} aria-hidden />{c.show}
  </Button>;
}

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
  const [hidden] = useHideSofia();
  const [tourActive, setTourActive] = useState(false);
  useEffect(() => {
    const ask = () => setOpen(true);
    const touring = (event: Event) => { setTourActive(Boolean((event as CustomEvent<boolean>).detail)); setOpen(false); };
    window.addEventListener(OPEN_SOFIA, ask);
    window.addEventListener(SOFIA_TOUR_ACTIVE, touring);
    return () => { window.removeEventListener(OPEN_SOFIA, ask); window.removeEventListener(SOFIA_TOUR_ACTIVE, touring); };
  }, []);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const keepOnScreen = (x: number, y: number) => ({
    x: Math.max(12, Math.min(x, window.innerWidth - 60)),
    y: Math.max(60, Math.min(y, window.innerHeight - 60)),
  });
  useEffect(() => {
    const onResize = () => setPosition((p) => p ? keepOnScreen(p.x, p.y) : p);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, busy, notice]);
  if (NO_SOFIA.has(pathname.replace(/\/$/, "") || "/") || HIDDEN.some((p) => pathname.startsWith(p))) return null;

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
    {/* Headset icon: the universal "someone here to help you" sign, in Sofía's own lavender so it never reads as a money button. */}
    {!hidden && !tourActive && <div className="fixed bottom-24 right-4 z-30 h-12 w-12 sm:bottom-6 sm:right-6"
      style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined}>
      <Button type="button" variant="ghost" size="icon" aria-label={c.hide} title={c.hide}
        onClick={() => { setOpen(false); dismissFloatingSofia(); }}
        className="absolute bottom-full right-0 mb-1 h-11 w-11 rounded-full hover:bg-transparent focus-visible:ring-sofia-text">
        <span className="grid size-7 place-items-center rounded-full border border-sofia-text/40 bg-sofia-surface text-sofia-text shadow-sm">
          <X className="size-4" aria-hidden />
        </span>
      </Button>
    <Button type="button" variant="ghost" size="icon" aria-label={c.open}
      onPointerDown={(e) => {
        if (!e.isPrimary || e.button !== 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        suppressClick.current = false;
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, left: rect.left, top: rect.top, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 6) return;
        d.moved = true;
        suppressClick.current = true;
        setPosition(keepOnScreen(d.left + dx, d.top + dy));
      }}
      onPointerUp={(e) => {
        if (drag.current?.id !== e.pointerId) return;
        drag.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => { drag.current = null; suppressClick.current = true; }}
      onLostPointerCapture={() => { drag.current = null; }}
      onClick={(e) => {
        if (suppressClick.current && e.detail !== 0) { suppressClick.current = false; return; }
        setOpen(true);
      }}
      className="sofia-fab relative flex h-12 w-12 touch-none select-none cursor-grab items-center justify-center rounded-full text-sofia-foreground ring-1 ring-sofia-glow/50 active:cursor-grabbing [&_svg]:size-6">
      <Headset className="h-6 w-6" aria-hidden />
      <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-background">
        <span className="size-2 rounded-full bg-live" />
        <span className="absolute size-2 animate-ping rounded-full bg-live/60 motion-reduce:animate-none" />
      </span>
    </Button>
    </div>}
    <Dialog open={open} onOpenChange={setOpen}>
      <ActionSheetContent closeLabel={lang === "en" ? "Close" : "Cerrar"} className="flex max-h-[85dvh] flex-col sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex items-center gap-3 pr-8">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-sofia)] p-[2px]" aria-hidden>
            <span className="grid size-full place-items-center rounded-full bg-sofia-disc text-base font-semibold text-sofia">{c.title[0]}</span>
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-base">{c.title}</DialogTitle>
            <DialogDescription className="text-xs">{c.sub}</DialogDescription>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-sofia-surface px-2 py-0.5 text-[10px] font-medium text-sofia-text">
              <span className="size-1.5 rounded-full bg-live" aria-hidden />{c.tag}
            </span>
          </div>
        </div>
        <div className="flex min-h-[200px] flex-1 flex-col gap-2 overflow-y-auto text-sm" aria-live="polite">
          <Bubble who="assistant">{c.hello}</Bubble>
          {!msgs.length && <div className="flex flex-wrap gap-2 pt-1">{c.chips.map((q) => <button key={q} type="button" onClick={() => send(q)} className="rounded-full border border-sofia-text/40 bg-sofia-surface px-3 py-1.5 text-xs text-sofia-text transition hover:border-sofia-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sofia-text">{q}</button>)}</div>}
          {msgs.map((m, i) => <Bubble key={i} who={m.role}>{m.text}</Bubble>)}
          {busy && (
            <div className="mr-8 flex items-center gap-2 self-start rounded-2xl rounded-bl-md bg-sofia-surface px-3 py-2.5">
              <span className="flex items-end gap-1" aria-hidden>
                <span className="sofia-dot size-1.5 rounded-full bg-sofia-text" style={{ animationDelay: "0s" }} />
                <span className="sofia-dot size-1.5 rounded-full bg-sofia-text" style={{ animationDelay: "0.18s" }} />
                <span className="sofia-dot size-1.5 rounded-full bg-sofia-text" style={{ animationDelay: "0.36s" }} />
              </span>
              <span className="text-xs text-muted-foreground">{c.typing}</span>
            </div>
          )}
          {notice && <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">{notice}</p>}
          <div ref={end} />
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={CHAT_MAX_CHARS} placeholder={c.ph} aria-label={c.ph}
            className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground sm:text-sm outline-none focus:ring-2 focus:ring-sofia-text" />
          <button type="submit" disabled={busy || !text.trim()} aria-label={c.send} className="sofia-fab flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sofia-foreground ring-1 ring-sofia-glow/50 disabled:opacity-50">
            <SendHorizontal className="h-5 w-5" aria-hidden />
          </button>
        </form>
        <p className="text-[11px] leading-snug text-muted-foreground">{c.note}</p>
      </ActionSheetContent>
    </Dialog>
  </>;
}

function Bubble({ who, children }: { who: Turn["role"]; children: React.ReactNode }) {
  return <div className={cn(
    who === "user"
      ? "ml-8 self-end rounded-2xl rounded-br-md bg-primary px-3 py-2 text-primary-foreground"
      : "mr-8 self-start whitespace-pre-line rounded-2xl rounded-bl-md bg-sofia-surface px-3 py-2 text-foreground",
  )}>
    {who === "assistant" && <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-sofia-text"><Headset className="size-3" aria-hidden />Sofía</span>}
    {children}
  </div>;
}
