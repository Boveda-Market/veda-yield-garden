import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, guideHead, type GuideEn } from "@/components/guide-layout";

const P = "/guias/retirar-cash-app-bitcoin";
const T = "Cómo retirar tus dólares digitales a Cash App o Bitcoin";
const D = "Paso a paso para convertir tus USDC y recibirlos en tu Cash App como Bitcoin, o retirarlos a tu banco, aprobando todo con tu huella.";
export const Route = createFileRoute("/guias/retirar-cash-app-bitcoin")({ staticData: { sitemap: true }, head: () => guideHead({ path: P, title: T, description: D }), component: Page });

function Page() {
  return <GuideLayout current={P} title={T} en={EN} minutes={4} intro="Tus dólares digitales no se quedan atrapados. Desde BÓVEDA puedes enviarlos a tu Cash App como Bitcoin o retirarlos a tu banco, y cada envío lo apruebas tú.">
    <section><h2>Antes de empezar</h2><ul><li>Ten USDC disponibles en tu billetera de BÓVEDA.</li><li>En Cash App, abre la sección de Bitcoin y toca <strong>Depositar bitcoin</strong> para copiar tu dirección.</li></ul></section>
    <section><h2>Retirar a Cash App (Bitcoin), paso a paso</h2><ol><li>En BÓVEDA, toca <strong>Retirar</strong> y elige <strong>Cash App</strong>.</li><li>Pega tu dirección de Bitcoin de Cash App y escribe el monto en dólares.</li><li>Revisa la cotización: verás cuánto Bitcoin recibirás y los cargos antes de confirmar.</li><li>Aprueba con tu huella o Face ID. El Bitcoin llega a tu Cash App, normalmente en minutos.</li></ol><p>Existe un monto mínimo para que los costos de la red Bitcoin no se coman tu retiro.</p></section>
    <section><h2>Retirar a tu banco</h2><p>También puedes vender tus USDC y recibir dólares en tu cuenta bancaria desde la opción <strong>Retirar a banco</strong>, a través de un proveedor de pagos regulado.</p></section>
    <section><h2>Consejos de seguridad</h2><ul><li>Copia y pega la dirección; nunca la escribas a mano.</li><li>Verifica los primeros y últimos caracteres antes de aprobar.</li><li>Los envíos en la red son definitivos: una dirección equivocada no se puede revertir.</li><li>Nadie de BÓVEDA te pedirá tus códigos ni hará el retiro por ti.</li></ul></section>
  </GuideLayout>;
}

const EN: GuideEn = { title: "How to withdraw your digital dollars to Cash App or Bitcoin", intro: "Your digital dollars never get stuck. From BÓVEDA you can send them to your Cash App as Bitcoin or withdraw them to your bank, and you approve every transfer yourself.", body: <>
    <section><h2>Before you start</h2><ul><li>Have USDC available in your BÓVEDA wallet.</li><li>In Cash App, open the Bitcoin section and tap <strong>Deposit bitcoin</strong> to copy your address.</li></ul></section>
    <section><h2>Withdraw to Cash App (Bitcoin), step by step</h2><ol><li>In BÓVEDA, tap <strong>Withdraw</strong> and choose <strong>Cash App</strong>.</li><li>Paste your Cash App Bitcoin address and enter the amount in dollars.</li><li>Review the quote: you'll see how much Bitcoin you'll receive and the charges before confirming.</li><li>Approve with your fingerprint or Face ID. The Bitcoin arrives in your Cash App, usually within minutes.</li></ol><p>There is a minimum amount so Bitcoin network costs don't eat into your withdrawal.</p></section>
    <section><h2>Withdraw to your bank</h2><p>You can also sell your USDC and receive dollars in your bank account with the <strong>Withdraw to bank</strong> option, through a regulated payment provider.</p></section>
    <section><h2>Safety tips</h2><ul><li>Copy and paste the address; never type it by hand.</li><li>Check the first and last characters before approving.</li><li>Network transfers are final: a wrong address can't be reversed.</li><li>No one from BÓVEDA will ask for your codes or make the withdrawal for you.</li></ul></section>
</> };
