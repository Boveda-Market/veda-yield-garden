import { useT } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { FEE_WALLET } from "@/lib/fees";

type Cat = "predict" | "vaults" | "fees" | "wallet" | "affiliates";
type GuideTo = "/guias/mercados-de-prediccion" | "/guias/que-es-usdc" | "/guias/retirar-cash-app-bitcoin" | "/guias/invertir-sin-estafas";
type Q = { id: string; cat: Cat; question: string; answer: string; guide?: GuideTo };
const GUIDES: Record<string, GuideTo> = { "predict-how": "/guias/mercados-de-prediccion", "wallet-usdc": "/guias/que-es-usdc", "withdraw-cashapp": "/guias/retirar-cash-app-bitcoin", "safety-why": "/guias/invertir-sin-estafas" };

export const CATEGORIES: { id: Cat | "all"; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "predict", label: "Sube/Baja" },
  { id: "vaults", label: "Bóvedas y retiros" },
  { id: "fees", label: "Intereses" },
  { id: "wallet", label: "Wallet y acceso" },
  { id: "affiliates", label: "Afiliados" },
];

export const questions: Q[] = [
  { id: "safety-why", cat: "wallet", question: "¿Dónde está guardado mi dinero y quién lo custodia?", answer: "En tu propia billetera criptográfica de autocustodia. BÓVEDA no funciona como un banco tradicional ni guarda fondos en balances internos. Tu cuenta opera con criptografía de clave pública: la llave privada vive en tu dispositivo y es la única que autoriza movimientos. Ni BÓVEDA, ni Google, ni ningún tercero pueden congelar, retener o mover tu capital." },
  { id: "vaults-earn", cat: "vaults", question: "¿Cuál es el motor algorítmico que genera los intereses?", answer: "Un creador de mercado automatizado de alta frecuencia. Tu capital aporta liquidez a un mercado abierto que procesa miles de cambios continuos. Por cada intercambio que pasa por la bóveda, el algoritmo cobra una microtarifa que se acredita a tu balance como interés compuesto en tiempo real. Las tasas son estimaciones, cambian y no están garantizadas." },
  { id: "vaults-partial", cat: "vaults", question: "¿Cómo y cuándo puedo retirar mi dinero o mis ganancias?", answer: "En cualquier momento, sin plazos de permanencia ni autorizaciones previas. Cobrar rendimientos: retiras los intereses generados a tu saldo en dólares y tu inversión sigue trabajando. Liquidar capital (25%, 50%, 75% o 100%): conviertes tu posición a dólares disponibles al instante. Desde Mi Billetera los pasas a tu banco o a Cash App." },
  { id: "wallet-usdc", cat: "wallet", question: "¿Qué son los dólares de mi cuenta y la reserva de operaciones?", answer: "Son dólares digitales estables respaldados 1:1 con reservas auditadas: un dólar en BÓVEDA equivale a $1.00, sin la volatilidad del mercado. Para validar cada orden con certeza criptográfica en la red global, tu cuenta mantiene en segundo plano una pequeña reserva de operaciones que cubre automáticamente las microtarifas de validación. Puedes depositar hasta $5,000 por operación." },
  { id: "predict-how", cat: "predict", question: "¿Cómo funcionan las rondas de Doble o Nada?", answer: "Son contratos binarios con liquidación atómica basados en oráculos de precio en tiempo real. Pronosticas si Bitcoin, Ethereum u otro activo terminará arriba o abajo en rondas de 5 minutos, 15 minutos o 4 horas. Cada contrato ganador liquida a $1.00 exacto; si no aciertas, pierdes lo que pusiste. BÓVEDA nunca es tu contraparte." },
];

const FEATURED = ["safety-why", "vaults-earn", "vaults-partial"];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function filterQuestions(list: Q[], cat: Cat | "all", query: string, tr: (s: string) => string = (s) => s) {
  const q = norm(query.trim());
  return list.filter((x) => (cat === "all" || x.cat === cat) && (!q || norm(tr(x.question)).includes(q) || norm(tr(x.answer)).includes(q)));
}

export function Faq({ preview = false }: { preview?: boolean }) {
  const t = useT();

  if (preview) {
    return <section aria-label={t("Preguntas frecuentes")} className="mt-12 border-t border-border pt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">{t("Preguntas frecuentes")}</h2><Link to="/faq" className="text-sm text-primary underline">{t("Ver todas")}</Link></div>
      {questions.filter((q) => FEATURED.includes(q.id)).map((q) => <Item key={q.id} q={q} t={t} />)}
    </section>;
  }

  return <section aria-label={t("Preguntas frecuentes")}>
    <div>{questions.map((q) => <Item key={q.id} q={q} t={t} />)}</div>

    <div className="mt-10 rounded-xl border border-border bg-card p-5 text-sm text-card-foreground">
      <p className="font-display font-semibold">{t("¿No encontraste tu respuesta?")}</p>
      <p className="mt-1 text-muted-foreground">{t("Escríbenos a admin@bovedamarket.app, consulta el canal oficial de Telegram o revisa los términos y la política de privacidad.")}</p>
      <div className="mt-3 flex flex-wrap gap-4 text-primary"><Link to="/guias" className="underline">{t("Guías")}</Link><Link to="/terminos" className="underline">{t("Términos y condiciones")}</Link><Link to="/privacidad" className="underline">{t("Política de privacidad")}</Link><a href="mailto:admin@bovedamarket.app" className="underline">admin@bovedamarket.app</a></div>
    </div>
    <p className="mt-8 break-all text-xs leading-6 text-muted-foreground">{t("Dirección de tesorería del protocolo:")}{" "}<span className="font-mono">{FEE_WALLET}</span></p>
  </section>;
}

function Item({ q, t, open }: { q: Q; t: (s: string) => string; open?: boolean }) {
  const guide = GUIDES[q.id];
  return <details id={`faq-${q.id}`} open={open || undefined} className="group border-b border-border">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-sm font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
      <span>{t(q.question)}</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
    </summary>
    <div className="max-w-2xl pb-4 text-sm leading-7 text-muted-foreground">{t(q.answer)}{guide && <> <Link to={guide} className="text-primary underline">{t("Leer la guía completa")}</Link></>}</div>
  </details>;
}
