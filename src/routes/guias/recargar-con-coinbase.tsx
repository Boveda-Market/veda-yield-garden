import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, guideHead, type GuideEn } from "@/components/guide-layout";

const P = "/guias/recargar-con-coinbase";
const T = "Cómo recargar dólares con Coinbase en BÓVEDA";
const D = "Entra con Google y recarga dólares con tu tarjeta, banco o saldo de Coinbase en minutos. Paso a paso, costos y seguridad.";
export const Route = createFileRoute("/guias/recargar-con-coinbase")({ staticData: { sitemap: true }, head: () => guideHead({ path: P, title: T, description: D }), component: Page });

export function Page() {
  return <GuideLayout current={P} title={T} en={EN} minutes={3} intro="Con BÓVEDA entras con Google en un segundo y recargas dólares a través de Coinbase, una de las plataformas más conocidas de Estados Unidos. Así funciona.">
    <section><h2>¿Por qué Coinbase?</h2><p>Coinbase es una empresa estadounidense que cotiza en bolsa (Nasdaq: COIN). La compra se hace en su propia página oficial: BÓVEDA nunca ve tu tarjeta ni los datos de tu banco.</p></section>
    <section><h2>Paso a paso</h2><ol><li><strong>Entra con Google.</strong> Tu billetera protegida se crea al instante, sin contraseñas.</li><li>Toca <strong>Depositar dólares</strong> y elige <strong>Coinbase</strong>.</li><li>Escribe el monto <strong>en dólares</strong> y paga con tarjeta, banco o tu saldo de Coinbase.</li><li>Tus dólares llegan a tu billetera en minutos, listos para Doble o Nada o las Bóvedas.</li></ol></section>
    <section><h2>¿Cuánto cuesta?</h2><p>BÓVEDA no cobra por recargar. Coinbase puede cobrar su propio cargo, que ves antes de pagar. Tu primera operación incluye la reserva de operaciones para que no tengas que comprar otra moneda.</p></section>
    <section><h2>¿Es seguro?</h2><ul><li>Pagas en la página oficial de Coinbase.</li><li>Los dólares van directo a tu billetera; solo tú puedes moverlos.</li><li>Nadie de BÓVEDA te pedirá códigos ni contraseñas.</li></ul></section>
    <section><h2>¿Y para retirar?</h2><p>También puedes retirar a tu banco o tarjeta con Coinbase desde Mi Billetera.</p></section>
  </GuideLayout>;
}

const EN: GuideEn = { title: "How to add dollars with Coinbase in BÓVEDA", intro: "With BÓVEDA you sign in with Google in a second and add dollars through Coinbase, one of the best-known platforms in the United States. Here's how it works.", body: <>
    <section><h2>Why Coinbase?</h2><p>Coinbase is a publicly traded US company (Nasdaq: COIN). The purchase happens on its own official page: BÓVEDA never sees your card or bank details.</p></section>
    <section><h2>Step by step</h2><ol><li><strong>Sign in with Google.</strong> Your protected wallet is created instantly, with no passwords.</li><li>Tap <strong>Deposit dollars</strong> and choose <strong>Coinbase</strong>.</li><li>Enter the amount <strong>in dollars</strong> and pay with a card, bank or your Coinbase balance.</li><li>Your dollars arrive in your wallet within minutes, ready for Double or Nothing or the Vaults.</li></ol></section>
    <section><h2>How much does it cost?</h2><p>BÓVEDA doesn't charge to add funds. Coinbase may charge its own fee, which you see before paying. Your first operation includes the operations reserve so you don't need to buy another coin.</p></section>
    <section><h2>Is it safe?</h2><ul><li>You pay on Coinbase's official page.</li><li>The dollars go straight to your wallet; only you can move them.</li><li>No one from BÓVEDA will ever ask for your codes or passwords.</li></ul></section>
    <section><h2>And to withdraw?</h2><p>You can also withdraw to your bank or card with Coinbase from My wallet.</p></section>
</> };
