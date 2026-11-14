import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, guideHead } from "@/components/guide-layout";

const P = "/guias/invertir-sin-estafas";
const T = "Cómo hacer rendir tu dinero sin caer en estafas";
const D = "Lecciones de Celsius, FTX y apps que congelaron retiros: señales de alerta y cómo proteger tus dólares con autocustodia.";
export const Route = createFileRoute("/guias/invertir-sin-estafas")({ staticData: { sitemap: true }, head: () => guideHead({ path: P, title: T, description: D }), component: Page });

function Page() {
  return <GuideLayout current={P} title={T} minutes={5} intro="Muchas personas perdieron sus ahorros en plataformas que prometían ganancias. El patrón casi siempre es el mismo: la empresa guardaba el dinero y un día dejó de devolverlo.">
    <section><h2>Lo que pasó en otros casos</h2><ul><li><strong>Celsius (junio 2022):</strong> congeló los retiros de millones de usuarios y luego se declaró en bancarrota.</li><li><strong>FTX (noviembre 2022):</strong> uno de los mayores exchanges colapsó; los fondos de clientes se habían usado sin su permiso.</li><li><strong>Apps de “inversión” falsas:</strong> muestran ganancias ficticias y, al intentar retirar, piden pagar “impuestos” o “comisiones de liberación”. Luego desaparecen.</li></ul></section>
    <section><h2>Señales de alerta</h2><ul><li>Ganancias garantizadas o demasiado altas.</li><li>Te piden pagar para poder retirar.</li><li>Alguien te escribe primero por mensaje privado para “ayudarte”.</li><li>Te piden tu frase de recuperación, códigos o contraseñas.</li><li>Presión para depositar “hoy”.</li></ul></section>
    <section><h2>Por qué la autocustodia te protege</h2><p>En BÓVEDA el dinero está en <strong>tu propia billetera</strong>, no en una cuenta de la empresa. Cada movimiento se aprueba solo con tu huella o Face ID, y ni BÓVEDA puede mover ni congelar tus fondos. Si un día BÓVEDA no existiera, tu dinero seguiría siendo tuyo.</p></section>
    <section><h2>Rendimiento con honestidad</h2><p>Las bóvedas generan rendimiento a partir de comisiones reales del mercado, que se muestran como tasa estimada, no prometida. Puede haber pérdidas. Empieza con poco, o practica primero con créditos ficticios.</p></section>
  </GuideLayout>;
}
