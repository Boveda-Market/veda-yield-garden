import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, guideHead, type GuideEn } from "@/components/guide-layout";

const P = "/guias/invertir-sin-estafas";
const T = "Cómo hacer rendir tu dinero sin caer en estafas";
const D = "Lecciones de Celsius, FTX y apps que congelaron retiros: señales de alerta y cómo proteger tus dólares con autocustodia.";
export const Route = createFileRoute("/guias/invertir-sin-estafas")({ staticData: { sitemap: true }, head: () => guideHead({ path: P, title: T, description: D }), component: Page });

export function Page() {
  return <GuideLayout current={P} title={T} en={EN} minutes={5} intro="Muchas personas perdieron sus ahorros en plataformas que prometían ganancias. El patrón casi siempre es el mismo: la empresa guardaba el dinero y un día dejó de devolverlo.">
    <section><h2>Lo que pasó en otros casos</h2><ul><li><strong>Celsius (junio 2022):</strong> congeló los retiros de millones de usuarios y luego se declaró en bancarrota.</li><li><strong>FTX (noviembre 2022):</strong> uno de los mayores exchanges colapsó; los fondos de clientes se habían usado sin su permiso.</li><li><strong>Apps de “inversión” falsas:</strong> muestran ganancias ficticias y, al intentar retirar, piden pagar “impuestos” o “comisiones de liberación”. Luego desaparecen.</li></ul></section>
    <section><h2>Señales de alerta</h2><ul><li>Ganancias garantizadas o demasiado altas.</li><li>Te piden pagar para poder retirar.</li><li>Alguien te escribe primero por mensaje privado para “ayudarte”.</li><li>Te piden tu frase de recuperación, códigos o contraseñas.</li><li>Presión para depositar “hoy”.</li></ul></section>
    <section><h2>Por qué la autocustodia te protege</h2><p>En Bóveda Market el dinero está en <strong>tu propia billetera</strong>, no en una cuenta de la empresa. Cada movimiento se aprueba solo con tu huella o Face ID, y ni Bóveda Market puede mover ni congelar tus fondos. Si un día Bóveda Market no existiera, tu dinero seguiría siendo tuyo.</p></section>
    <section><h2>Rendimiento con honestidad</h2><p>Las bóvedas generan rendimiento a partir de comisiones reales del mercado, que se muestran como tasa estimada, no prometida. Puede haber pérdidas. Empieza con poco y retira cuando quieras.</p></section>
  </GuideLayout>;
}

const EN: GuideEn = { title: "How to grow your money without falling for scams", intro: "Many people lost their savings on platforms that promised returns. The pattern is almost always the same: the company held the money and one day stopped giving it back.", body: <>
    <section><h2>What happened in other cases</h2><ul><li><strong>Celsius (June 2022):</strong> froze withdrawals for millions of users and then filed for bankruptcy.</li><li><strong>FTX (November 2022):</strong> one of the largest exchanges collapsed; customer funds had been used without their permission.</li><li><strong>Fake “investment” apps:</strong> show fictitious gains and, when you try to withdraw, ask you to pay “taxes” or “release fees.” Then they disappear.</li></ul></section>
    <section><h2>Warning signs</h2><ul><li>Guaranteed or unrealistically high returns.</li><li>You're asked to pay before you can withdraw.</li><li>Someone messages you first privately to “help” you.</li><li>You're asked for your recovery phrase, codes or passwords.</li><li>Pressure to deposit “today.”</li></ul></section>
    <section><h2>Why self-custody protects you</h2><p>In Bóveda Market your money is in <strong>your own wallet</strong>, not in a company account. Every move is approved only with your fingerprint or Face ID, and not even Bóveda Market can move or freeze your funds. If Bóveda Market ceased to exist one day, your money would still be yours.</p></section>
    <section><h2>Honest returns</h2><p>Vaults earn from real market fees, shown as an estimated rate, never a promise. Losses are possible. Start small and withdraw whenever you want.</p></section>
</> };
