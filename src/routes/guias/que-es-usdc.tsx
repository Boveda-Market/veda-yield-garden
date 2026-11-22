import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, guideHead, type GuideEn } from "@/components/guide-layout";

const P = "/guias/que-es-usdc";
const T = "¿Qué es USDC y cómo comprarlo con tarjeta?";
const D = "Qué es USDC, por qué vale siempre 1 dólar y cómo comprarlo con tarjeta en minutos sin confundirlo con otras criptomonedas.";
export const Route = createFileRoute("/guias/que-es-usdc")({ staticData: { sitemap: true }, head: () => guideHead({ path: P, title: T, description: D }), component: Page });

export function Page() {
  return <GuideLayout current={P} title={T} en={EN} minutes={4} intro="USDC es un dólar digital: cada unidad está pensada para valer 1 dólar estadounidense. Te permite guardar y mover dólares por internet, a cualquier hora, sin depender de un banco.">
    <section><h2>¿Qué es USDC?</h2><p>USDC es una “moneda estable” emitida por la empresa Circle. A diferencia de Bitcoin, su precio no sube ni baja: <strong>1 USDC ≈ 1 dólar</strong>. Circle mantiene reservas en efectivo y bonos del Tesoro de EE. UU. de corto plazo, y publica informes periódicos de esas reservas.</p></section>
    <section><h2>¿Por qué usar dólares digitales?</h2><ul><li>Su valor no fluctúa como otras criptomonedas.</li><li>Envíos en segundos, también fines de semana.</li><li>Tú controlas tu dinero: nadie puede congelarlo en tu billetera.</li></ul></section>
    <section><h2>Cómo comprar USDC con tarjeta, paso a paso</h2><ol><li>Abre tu billetera en Bóveda Market e inicia sesión con tu correo, Google o huella.</li><li>Toca <strong>Comprar dólares</strong> y elige el proveedor (Coinbase o MoonPay).</li><li>Escribe el monto <strong>en dólares</strong>, por ejemplo $50.</li><li>Paga con tu tarjeta. Los USDC llegan a tu billetera en minutos.</li></ol></section>
    <section><h2>El error más común: comprar otra moneda</h2><p>En algunos proveedores la casilla del monto puede mostrarse en otra criptomoneda. Si escribes “10” ahí, podrías comprar 10 monedas en vez de 10 dólares. Por eso Bóveda Market abre la compra siempre en <strong>USDC y en dólares</strong>. Antes de pagar, confirma que diga <strong>USDC</strong> y que el total sea el monto en dólares que esperas.</p></section>
    <section><h2>¿Y la comisión de red?</h2><p>Cada movimiento necesita una pequeña reserva de red. Si te quedas sin ella, Bóveda Market te ofrece un botón para recargarla con una fracción de tus USDC, sin tener que comprar otra moneda.</p></section>
  </GuideLayout>;
}

const EN: GuideEn = { title: "What is USDC and how do you buy it with a card?", intro: "USDC is a digital dollar: each unit is designed to be worth 1 US dollar. It lets you hold and move dollars online, at any time, without depending on a bank.", body: <>
    <section><h2>What is USDC?</h2><p>USDC is a “stablecoin” issued by the company Circle. Unlike Bitcoin, its price doesn't go up or down: <strong>1 USDC ≈ 1 dollar</strong>. Circle holds reserves in cash and short-term US Treasury bonds, and publishes regular reports on those reserves.</p></section>
    <section><h2>Why use digital dollars?</h2><ul><li>Their value doesn't swing like other cryptocurrencies.</li><li>Transfers in seconds, weekends included.</li><li>You control your money: no one can freeze it in your wallet.</li></ul></section>
    <section><h2>How to buy USDC with a card, step by step</h2><ol><li>Open your wallet in Bóveda Market and sign in with your email, Google or fingerprint.</li><li>Tap <strong>Buy dollars</strong> and choose the provider (Coinbase or MoonPay).</li><li>Enter the amount <strong>in dollars</strong>, for example $50.</li><li>Pay with your card. The USDC arrives in your wallet within minutes.</li></ol></section>
    <section><h2>The most common mistake: buying another coin</h2><p>Some providers may show the amount box in another cryptocurrency. If you type “10” there, you could buy 10 coins instead of 10 dollars. That's why Bóveda Market always opens the purchase in <strong>USDC and in dollars</strong>. Before paying, confirm it says <strong>USDC</strong> and that the total is the dollar amount you expect.</p></section>
    <section><h2>What about the network fee?</h2><p>Every move needs a small network reserve. If you run out, Bóveda Market offers a button to top it up with a fraction of your USDC, without buying another coin.</p></section>
</> };
