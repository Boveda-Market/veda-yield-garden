import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, guideHead, type GuideEn } from "@/components/guide-layout";

const P = "/guias/trae-tus-monedas";
const T = "Cómo traer tus propias monedas a Bóveda Market";
const D = "Envía tu SOL, dólares digitales o monedas desde otra billetera o exchange y ponlos a trabajar con el Piloto Automático, sin pasos de principiante.";
export const Route = createFileRoute("/guias/trae-tus-monedas")({ staticData: { sitemap: true }, head: () => guideHead({ path: P, title: T, description: D }), component: Page });

export function Page() {
  return <GuideLayout current={P} title={T} en={EN} minutes={3} intro="¿Ya tienes monedas en Phantom, Solflare, Coinbase o Binance? No necesitas comprar nada de nuevo: envíalas a tu billetera de Bóveda Market y el sistema las pone a aportar liquidez.">
    <section><h2>1. Copia tu dirección</h2><p>Entra a <strong>Billetera</strong> y toca <strong>Recibir</strong>. Copia tu dirección o escanea el código QR. Es una dirección de la red Solana: envía solo por esa red.</p></section>
    <section><h2>2. Envía tus monedas</h2><ul><li><strong>SOL</strong>: sirve como reserva de operaciones y también se puede cambiar a dólares.</li><li><strong>USDC</strong>: dólares digitales listos para depositar.</li><li><strong>Monedas de las bóvedas</strong> (cbBTC, TRUMP, GTA6, DCTY): se pueden cambiar a dólares en un toque.</li></ul><p>Haz primero un envío pequeño de prueba si es tu primera vez.</p></section>
    <section><h2>3. El sistema te reconoce</h2><p>Cuando llegan tus fondos, Bóveda Market detecta que trajiste tus propias monedas y <strong>quita las guías para usuarios nuevos</strong>: sin pasos de compra con tarjeta ni Coinbase. Vas directo a tu billetera y tus bóvedas.</p></section>
    <section><h2>4. Abre tu bóveda inteligente</h2><p>Si tienes dólares, toca <strong>Depositar</strong> y confirma. Si trajiste SOL u otras monedas, toca <strong>Cambiar</strong> en <strong>Billetera</strong>, elige la moneda y el monto, y confirma: se convierten a dólares sin comisión de Bóveda Market. Después toca <strong>Depositar</strong>. El sistema arma la posición en las bóvedas públicas de Meteora.</p></section>
    <section><h2>5. Deja que el Piloto Automático trabaje</h2><p>Olvídate de calcular rangos y rebalancear a mano. El Piloto Automático vigila el precio 24/7, recentra tu bóveda cuando sale de rango y cobra las comisiones por ti. Las tasas son estimaciones, cambian y existe riesgo de pérdida. El piloto automático solo funciona con cuentas registradas.</p></section>
  </GuideLayout>;
}

const EN: GuideEn = { title: "How to bring your own coins to Bóveda Market", intro: "Already have coins in Phantom, Solflare, Coinbase or Binance? No need to buy again: send them to your Bóveda Market wallet and the system puts them to work providing liquidity.", body: <>
    <section><h2>1. Copy your address</h2><p>Open <strong>Wallet</strong> and tap <strong>Receive</strong>. Copy your address or scan the QR code. It is a Solana network address: send only on that network.</p></section>
    <section><h2>2. Send your coins</h2><ul><li><strong>SOL</strong>: works as your operations reserve and can also be swapped to dollars.</li><li><strong>USDC</strong>: digital dollars ready to deposit.</li><li><strong>Vault coins</strong> (cbBTC, TRUMP, GTA6, DCTY): can be swapped to dollars in one tap.</li></ul><p>Send a small test amount first if it's your first time.</p></section>
    <section><h2>3. The system recognizes you</h2><p>When your funds arrive, Bóveda Market detects you brought your own coins and <strong>removes the new-user guides</strong>: no card or Coinbase purchase steps. You go straight to your wallet and vaults.</p></section>
    <section><h2>4. Open your smart vault</h2><p>If you have dollars, tap <strong>Deposit</strong> and confirm. If you brought SOL or other coins, tap <strong>Swap</strong> in <strong>Wallet</strong>, choose the coin and the amount, and confirm: they turn into dollars with no Bóveda Market fee. Then tap <strong>Deposit</strong>. The system builds the position in Meteora's public vaults.</p></section>
    <section><h2>5. Let Autopilot do the work</h2><p>Forget calculating ranges and rebalancing by hand. Autopilot watches the price 24/7, recenters your vault when it leaves its range and collects the fees for you. Rates are estimates, they change and there is risk of loss.</p></section>
</> };
