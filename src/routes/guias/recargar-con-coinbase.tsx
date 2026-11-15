import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, guideHead } from "@/components/guide-layout";

const P = "/guias/recargar-con-coinbase";
const T = "Cómo recargar dólares con Coinbase en BÓVEDA";
const D = "Entra con Google y recarga dólares con tu tarjeta, banco o saldo de Coinbase en minutos. Paso a paso, costos y seguridad.";
export const Route = createFileRoute("/guias/recargar-con-coinbase")({ staticData: { sitemap: true }, head: () => guideHead({ path: P, title: T, description: D }), component: Page });

function Page() {
  return <GuideLayout current={P} title={T} minutes={3} intro="Con BÓVEDA entras con Google en un segundo y recargas dólares a través de Coinbase, una de las plataformas más conocidas de Estados Unidos. Así funciona.">
    <section><h2>¿Por qué Coinbase?</h2><p>Coinbase es una empresa estadounidense que cotiza en bolsa (Nasdaq: COIN). La compra se hace en su propia página oficial: BÓVEDA nunca ve tu tarjeta ni los datos de tu banco.</p></section>
    <section><h2>Paso a paso</h2><ol><li><strong>Entra con Google.</strong> Tu billetera protegida se crea al instante, sin contraseñas.</li><li>Toca <strong>Añadir fondos</strong> y elige <strong>Coinbase</strong>.</li><li>Escribe el monto <strong>en dólares</strong> y paga con tarjeta, banco o tu saldo de Coinbase.</li><li>Tus dólares llegan a tu billetera en minutos, listos para Doble o Nada o las Bóvedas.</li></ol></section>
    <section><h2>¿Cuánto cuesta?</h2><p>BÓVEDA no cobra por recargar. Coinbase puede cobrar su propio cargo, que ves antes de pagar. Tu primera operación incluye la reserva de operaciones para que no tengas que comprar otra moneda.</p></section>
    <section><h2>¿Es seguro?</h2><ul><li>Pagas en la página oficial de Coinbase.</li><li>Los dólares van directo a tu billetera; solo tú puedes moverlos.</li><li>Nadie de BÓVEDA te pedirá códigos ni contraseñas.</li></ul></section>
    <section><h2>¿Y para retirar?</h2><p>También puedes retirar a tu banco o tarjeta con Coinbase desde Mi Billetera.</p></section>
  </GuideLayout>;
}
