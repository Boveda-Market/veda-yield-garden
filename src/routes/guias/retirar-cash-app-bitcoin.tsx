import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, guideHead } from "@/components/guide-layout";

const P = "/guias/retirar-cash-app-bitcoin";
const T = "Cómo retirar tus dólares digitales a Cash App o Bitcoin";
const D = "Paso a paso para convertir tus USDC y recibirlos en tu Cash App como Bitcoin, o retirarlos a tu banco, aprobando todo con tu huella.";
export const Route = createFileRoute("/guias/retirar-cash-app-bitcoin")({ staticData: { sitemap: true }, head: () => guideHead({ path: P, title: T, description: D }), component: Page });

function Page() {
  return <GuideLayout current={P} title={T} minutes={4} intro="Tus dólares digitales no se quedan atrapados. Desde BÓVEDA puedes enviarlos a tu Cash App como Bitcoin o retirarlos a tu banco, y cada envío lo apruebas tú.">
    <section><h2>Antes de empezar</h2><ul><li>Ten USDC disponibles en tu billetera de BÓVEDA.</li><li>En Cash App, abre la sección de Bitcoin y toca <strong>Depositar bitcoin</strong> para copiar tu dirección.</li></ul></section>
    <section><h2>Retirar a Cash App (Bitcoin), paso a paso</h2><ol><li>En BÓVEDA, toca <strong>Retirar</strong> y elige <strong>Cash App</strong>.</li><li>Pega tu dirección de Bitcoin de Cash App y escribe el monto en dólares.</li><li>Revisa la cotización: verás cuánto Bitcoin recibirás y los cargos antes de confirmar.</li><li>Aprueba con tu huella o Face ID. El Bitcoin llega a tu Cash App, normalmente en minutos.</li></ol><p>Existe un monto mínimo para que los costos de la red Bitcoin no se coman tu retiro.</p></section>
    <section><h2>Retirar a tu banco</h2><p>También puedes vender tus USDC y recibir dólares en tu cuenta bancaria desde la opción <strong>Retirar a banco</strong>, a través de un proveedor de pagos regulado.</p></section>
    <section><h2>Consejos de seguridad</h2><ul><li>Copia y pega la dirección; nunca la escribas a mano.</li><li>Verifica los primeros y últimos caracteres antes de aprobar.</li><li>Los envíos en la red son definitivos: una dirección equivocada no se puede revertir.</li><li>Nadie de BÓVEDA te pedirá tus códigos ni hará el retiro por ti.</li></ul></section>
  </GuideLayout>;
}
