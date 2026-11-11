import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Search, X } from "lucide-react";
import { FEE_WALLET } from "@/lib/fees";

type Cat = "predict" | "vaults" | "fees" | "wallet" | "affiliates" | "trial";
type Q = { id: string; cat: Cat; question: string; answer: string };

export const CATEGORIES: { id: Cat | "all"; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "predict", label: "Sube/Baja" },
  { id: "vaults", label: "Bóvedas y retiros" },
  { id: "fees", label: "Comisiones" },
  { id: "wallet", label: "Wallet y acceso" },
  { id: "affiliates", label: "Afiliados" },
  { id: "trial", label: "Prueba" },
];

export const questions: Q[] = [
  { id: "predict-how", cat: "predict", question: "¿Cómo funciona Sube/Baja?", answer: "Eliges Bitcoin, Ethereum o SOL y una ronda de 5 minutos, 15 minutos o diaria. Predices si el precio terminará arriba (Sube) o abajo (Baja) del precio de inicio. Cada contrato ganador paga 1.00 USD; si no aciertas, pierdes lo que invertiste." },
  { id: "predict-claim", cat: "predict", question: "¿Cómo cobro mis predicciones ganadas?", answer: "Cuando la ronda termina y aciertas, aparece el botón «Reclamar ganancias». Firmarás dos transacciones: 1) cobrar el pago y 2) cambiarlo a USDC. Si la segunda falla, el dinero sigue en tu wallet y puedes cambiarlo en Mi wallet → Cambiar." },
  { id: "predict-odds", cat: "predict", question: "¿Qué significan los porcentajes de Sube y Baja?", answer: "Son el precio actual de cada lado en el mercado. Un 60% significa que un contrato cuesta unos 0.60 USD y paga 1.00 USD si aciertas. Cambian en tiempo real según lo que compran otras personas." },
  { id: "predict-sell", cat: "predict", question: "¿Puedo salir de una predicción antes de que termine?", answer: "Sí, mientras la ronda está abierta puedes vender tu posición al precio del momento. Puede ser más o menos de lo que pagaste. BÓVEDA nunca es tu contraparte." },
  { id: "predict-lost", cat: "predict", question: "¿Qué pasa si mi predicción pierde?", answer: "Verás un aviso «No acertaste» con lo que invertiste. No hay nada que reclamar y la posición deja de aparecer entre tus predicciones abiertas." },
  { id: "vaults-earn", cat: "vaults", question: "¿Cómo se generan las ganancias en las bóvedas?", answer: "Tu depósito se suma a una bóveda que cobra comisiones cada vez que otras personas cambian monedas en ella. Esas comisiones se reparten entre quienes aportan. Las tasas son estimaciones, cambian y puedes perder dinero." },
  { id: "vaults-partial", cat: "vaults", question: "¿Cómo retiro solo una parte de mi bóveda?", answer: "En tus posiciones abiertas toca «Cerrar» o «Retirar o liquidar» y elige 25%, 50%, 75% o Todo. Recibes esa parte en USDC y el resto sigue invertido. Revisas el monto antes de firmar." },
  { id: "vaults-harvest", cat: "vaults", question: "¿Cuál es la diferencia entre cosechar y liquidar?", answer: "Cosechar cobra las comisiones ganadas sin tocar tu inversión. Liquidar retira la parte que elijas y la convierte a USDC. La liquidez bloqueada no se puede liquidar." },
  { id: "vaults-compound", cat: "vaults", question: "¿Puedo reinvertir mis ganancias?", answer: "Sí. Puedes volver a sumar lo cosechado a la misma posición, sin cambios extra de moneda. Siempre revisas y firmas antes." },
  { id: "vaults-limits", cat: "vaults", question: "¿Cuánto puedo depositar?", answer: "Entre 1 y 10,000 USDC por depósito en las bóvedas SOL o MET. Puedes retirar cuando quieras, sin plazos de permanencia." },
  { id: "vaults-convert", cat: "vaults", question: "¿Por qué se convierte parte de mis USDC?", answer: "Cada bóveda combina USDC con otro token. Parte del depósito se convierte a ese token. Al retirar, el importe puede ser distinto al que depositaste." },
  { id: "vaults-pnl", cat: "vaults", question: "¿Qué significa Ganancias (PNL)?", answer: "Es la suma de las comisiones que cosechaste: USDC más los otros tokens valorados al precio actual. Es un importe bruto y no mide la ganancia o pérdida total de tu inversión." },
  { id: "vaults-guarantee", cat: "vaults", question: "¿Las ganancias están garantizadas?", answer: "No. Las tasas son estimaciones y cambian. Puedes perder parte o todo tu dinero." },
  { id: "fees-cost", cat: "fees", question: "¿Cuánto cuesta operar?", answer: "Enviar y cambiar monedas es gratis, y entrar a Sube/Baja también. Al depositar, cosechar, cerrar o retirar se cobra 1% desde el primer dólar. Por ejemplo, en 50 USDC pagas 0.50 USDC. En Sube/Baja solo pagas 1% de lo que ganes al reclamar. Los costes de red se pagan aparte." },
  { id: "fees-swap", cat: "fees", question: "¿Cómo se cobra la comisión al cambiar monedas?", answer: "Si el cambio incluye USDC, la comisión sale del mismo cambio. Si no incluye USDC, se cobra aparte en USDC, así que necesitas un poco de USDC en tu wallet." },
  { id: "fees-network", cat: "fees", question: "¿Qué son los costes de red?", answer: "Una pequeña cantidad de SOL que se paga en cada operación para procesarla. No va a BÓVEDA. Mantén un poco de SOL en tu wallet." },
  { id: "fees-predict", cat: "fees", question: "¿Sube/Baja tiene comisión de BÓVEDA?", answer: "Ves el precio exacto antes de firmar. Entrar es gratis; al reclamar se cobra 1% sobre el total que cobras." },
  { id: "wallet-login", cat: "wallet", question: "¿Cómo inicio sesión?", answer: "Puedes entrar con email, Google o una wallet compatible, como Phantom o Jupiter Wallet. Si entras con email o Google y no tienes wallet, se te crea una integrada. Por seguridad, la sesión se cierra sola tras 5 minutos sin uso." },
  { id: "wallet-usdc", cat: "wallet", question: "¿Qué es USDC y cómo lo consigo?", answer: "USDC es una moneda digital que busca valer 1 dólar. Puedes comprarla con «Comprar USDC» o cambiar otras monedas en Mi wallet → Cambiar. No es un depósito bancario ni está asegurado." },
  { id: "wallet-jupusd", cat: "wallet", question: "¿Qué es JupUSD en mi wallet?", answer: "Es la moneda en que llegan los pagos de predicciones. Vale 1 dólar y puedes cambiarla a USDC en Mi wallet → Cambiar con el botón Máx." },
  { id: "wallet-security", cat: "wallet", question: "¿Cómo protejo mi cuenta?", answer: "En Mi cuenta → Seguridad puedes añadir passkey, app autenticadora o 2FA. Nunca compartas tus claves ni tu frase de recuperación." },
  { id: "wallet-connect", cat: "wallet", question: "¿Qué hago si no puedo conectar mi wallet?", answer: "Comprueba que esté instalada y desbloqueada, o abre la app en otra pestaña. Nunca compartas tus claves ni tu frase de recuperación." },
  { id: "wallet-activity", cat: "wallet", question: "¿Dónde veo mis movimientos?", answer: "En Mi wallet → Actividad del wallet verás cada movimiento con su tipo (cambio, depósito, cosecha, predicción, reclamo) y su comprobante." },
  { id: "wallet-pending", cat: "wallet", question: "¿Qué hago si una operación queda pendiente?", answer: "Consulta su comprobante antes de volver a intentarlo. Solo está completada cuando la red la confirma. Si falla, puede cobrar costes de red." },
  { id: "wallet-data", cat: "wallet", question: "¿Dónde se guardan mis datos y mi email?", answer: "El acceso lo gestiona un proveedor seguro. Si dejas tu email para novedades, se guarda de forma privada con tu consentimiento. Los movimientos reales son públicos en la red." },
  { id: "wallet-install", cat: "wallet", question: "¿Puedo instalar BÓVEDA?", answer: "Sí, desde un navegador compatible puedes añadirla a tu pantalla de inicio. Necesitas internet para operar." },
  { id: "aff-how", cat: "affiliates", question: "¿Cómo funciona el programa de afiliados?", answer: "Compartes tu enlace y recibes 50% de las comisiones de depósito, cosecha y retiro de las personas que invites, más 10% de las que inviten ellas. Los cambios y envíos no generan comisión de afiliado." },
  { id: "aff-pay", cat: "affiliates", question: "¿Cuándo cobro mis comisiones de afiliado?", answer: "Se acreditan automáticamente después de cada operación confirmada. Desde 10 USDC acumulados tocas «Cobrar comisiones» y las recibes completas al instante; solo necesitas unos 0.003 SOL para la tarifa de red." },
  { id: "trial-what", cat: "trial", question: "¿Puedo probar sin crear una cuenta?", answer: "Sí. Elige «Probar como invitado» y recibe 1,000 créditos ficticios. No necesitas wallet ni dinero. La prueba se guarda en este navegador." },
  { id: "trial-diff", cat: "trial", question: "¿Cuál es la diferencia entre Real y Prueba?", answer: "Real usa dinero de tu wallet. Prueba usa 1,000 créditos ficticios y no mueve dinero." },
  { id: "trial-cash", cat: "trial", question: "¿Puedo convertir los créditos en dinero?", answer: "No. Los créditos y las ganancias de Prueba son ficticios. No se pueden retirar ni pasar a Real." },
];

const FEATURED = ["predict-claim", "vaults-partial", "fees-cost"];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function filterQuestions(list: Q[], cat: Cat | "all", query: string, tr: (s: string) => string = (s) => s) {
  const q = norm(query.trim());
  return list.filter((x) => (cat === "all" || x.cat === cat) && (!q || norm(tr(x.question)).includes(q) || norm(tr(x.answer)).includes(q)));
}

export function Faq({ preview = false }: { preview?: boolean }) {
  const t = useT();
  const [cat, setCat] = useState<Cat | "all">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const shown = useMemo(() => filterQuestions(questions, cat, query, t), [cat, query, t]);

  const openQuestion = (id: string) => {
    setCat("all"); setQuery(""); setOpen(id);
    setTimeout(() => document.getElementById(`faq-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  if (preview) {
    return <section aria-label={t("Preguntas frecuentes")} className="mt-12 border-t border-border pt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">{t("Preguntas frecuentes")}</h2><Link to="/faq" className="text-sm text-primary underline">{t("Ver todas")}</Link></div>
      {questions.filter((q) => FEATURED.includes(q.id)).map((q) => <Item key={q.id} q={q} t={t} />)}
    </section>;
  }

  return <section aria-label={t("Preguntas frecuentes")}>
    <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("Lo más consultado")}</h2>
    <div className="mb-8 grid gap-3 sm:grid-cols-3">
      {FEATURED.map((id) => { const q = questions.find((x) => x.id === id)!; return <button key={id} type="button" onClick={() => openQuestion(id)} className="rounded-xl border border-border bg-card p-4 text-left font-display text-sm font-medium text-card-foreground transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring">{t(q.question)}</button>; })}
    </div>

    <div className="relative mb-4">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Busca tu duda: comisiones, retirar, predicciones…")} aria-label={t("Buscar en preguntas frecuentes")} className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring" />
      {query && <button type="button" onClick={() => setQuery("")} aria-label={t("Limpiar búsqueda")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
    </div>

    <div role="tablist" aria-label={t("Categorías")} className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {CATEGORIES.map((c) => <button key={c.id} role="tab" aria-selected={cat === c.id} type="button" onClick={() => setCat(c.id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${cat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>{t(c.label)}</button>)}
    </div>

    <p className="mb-2 text-xs text-muted-foreground" aria-live="polite">{shown.length} {t(shown.length === 1 ? "resultado" : "resultados")}</p>

    {shown.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      <p>{t("No encontramos preguntas con esa búsqueda.")}</p>
      <button type="button" onClick={() => { setQuery(""); setCat("all"); }} className="mt-3 text-primary underline">{t("Ver todas las preguntas")}</button>
    </div> : <div>{shown.map((q) => <Item key={q.id} q={q} t={t} open={open === q.id} />)}</div>}

    <div className="mt-10 rounded-xl border border-border bg-card p-5 text-sm text-card-foreground">
      <p className="font-display font-semibold">{t("¿No encontraste tu respuesta?")}</p>
      <p className="mt-1 text-muted-foreground">{t("Revisa los términos o la política de privacidad, o abre Mi cuenta para ver tu actividad y seguridad.")}</p>
      <div className="mt-3 flex flex-wrap gap-4 text-primary"><Link to="/terminos" className="underline">{t("Términos y condiciones")}</Link><Link to="/privacidad" className="underline">{t("Política de privacidad")}</Link></div>
    </div>
    <p className="mt-8 break-all text-xs leading-6 text-muted-foreground">{t("Wallet destinataria de cargos de Real:")}{" "}<span className="font-mono">{FEE_WALLET}</span></p>
  </section>;
}

function Item({ q, t, open }: { q: Q; t: (s: string) => string; open?: boolean }) {
  return <details id={`faq-${q.id}`} open={open || undefined} className="group border-b border-border">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-sm font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
      <span>{t(q.question)}</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
    </summary>
    <div className="max-w-2xl pb-4 text-sm leading-7 text-muted-foreground">{t(q.answer)}</div>
  </details>;
}
