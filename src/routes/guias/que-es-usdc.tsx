import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, guideHead } from "@/components/guide-layout";

const P = "/guias/que-es-usdc";
const T = "¿Qué es USDC y cómo comprarlo con tarjeta?";
const D = "Qué es USDC, por qué vale siempre 1 dólar y cómo comprarlo con tarjeta en minutos sin confundirlo con otras criptomonedas.";
export const Route = createFileRoute("/guias/que-es-usdc")({ staticData: { sitemap: true }, head: () => guideHead({ path: P, title: T, description: D }), component: Page });

function Page() {
  return <GuideLayout current={P} title={T} minutes={4} intro="USDC es un dólar digital: cada unidad está pensada para valer 1 dólar estadounidense. Te permite guardar y mover dólares por internet, a cualquier hora, sin depender de un banco.">
    <section><h2>¿Qué es USDC?</h2><p>USDC es una “moneda estable” emitida por la empresa Circle. A diferencia de Bitcoin, su precio no sube ni baja: <strong>1 USDC ≈ 1 dólar</strong>. Circle mantiene reservas en efectivo y bonos del Tesoro de EE. UU. de corto plazo, y publica informes periódicos de esas reservas.</p></section>
    <section><h2>¿Por qué usar dólares digitales?</h2><ul><li>Su valor no fluctúa como otras criptomonedas.</li><li>Envíos en segundos, también fines de semana.</li><li>Tú controlas tu dinero: nadie puede congelarlo en tu billetera.</li></ul></section>
    <section><h2>Cómo comprar USDC con tarjeta, paso a paso</h2><ol><li>Abre tu billetera en BÓVEDA e inicia sesión con tu correo, Google o huella.</li><li>Toca <strong>Comprar dólares</strong> y elige el proveedor (Coinbase o MoonPay).</li><li>Escribe el monto <strong>en dólares</strong>, por ejemplo $50.</li><li>Paga con tu tarjeta. Los USDC llegan a tu billetera en minutos.</li></ol></section>
    <section><h2>El error más común: comprar otra moneda</h2><p>En algunos proveedores la casilla del monto puede mostrarse en otra criptomoneda. Si escribes “10” ahí, podrías comprar 10 monedas en vez de 10 dólares. Por eso BÓVEDA abre la compra siempre en <strong>USDC y en dólares</strong>. Antes de pagar, confirma que diga <strong>USDC</strong> y que el total sea el monto en dólares que esperas.</p></section>
    <section><h2>¿Y la comisión de red?</h2><p>Cada movimiento necesita una pequeña reserva de red. Si te quedas sin ella, BÓVEDA te ofrece un botón para recargarla con una fracción de tus USDC, sin tener que comprar otra moneda.</p></section>
  </GuideLayout>;
}
