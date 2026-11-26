import { createFileRoute } from "@tanstack/react-router";
import { PostLayout, postHead } from "@/components/blog-layout";
import { BarChart, CompareTable, StatCards } from "@/components/blog-visuals";

// Capital efficiency of a ±r range vs. full range (constant-product math): 1 / (1 - sqrt((1-r)/(1+r))).
const eff = (r: number) => Math.round((1 / (1 - Math.sqrt((1 - r) / (1 + r)))) * 10) / 10;
const RANGES = [{ es: "Todo el rango", en: "Full range", v: 1 }, { es: "±50 %", en: "±50%", v: eff(0.5) }, { es: "±20 %", en: "±20%", v: eff(0.2) }, { es: "±5 %", en: "±5%", v: eff(0.05) }];
// Impermanent loss vs. holding, full range, when price moves by factor k: 2√k/(1+k) − 1.
const il = (k: number) => Math.round((1 - (2 * Math.sqrt(k)) / (1 + k)) * 1000) / 10;

const P = "/blog/liquidez-concentrada";
export const Route = createFileRoute("/blog/liquidez-concentrada")({ staticData: { sitemap: true }, head: () => postHead("es", P), component: Page });

export function Page() {
  return <PostLayout path={P} es={ES} enBody={EN} />;
}

const ES = <>
  <p>Todo mercado necesita algo que casi nunca se ve: <strong>liquidez</strong>, es decir, capital disponible en el instante en que alguien quiere comprar o vender. Sin ella, cada operación mueve el precio en contra del usuario (<em>slippage</em>), los diferenciales se abren y el mercado deja de ser útil.</p>
  <section><h2>1. Del libro de órdenes al AMM</h2><p>En las finanzas tradicionales la liquidez la ponen creadores de mercado profesionales que publican órdenes de compra y venta en un libro de órdenes. Capturan el <em>spread</em> y el acceso está cerrado: hace falta capital, licencias e infraestructura.</p><p>En una blockchain, actualizar miles de órdenes por segundo es caro. La respuesta fueron los <strong>AMM</strong> (<em>Automated Market Makers</em>): un contrato público guarda dos activos y fija el precio con una fórmula. En el modelo clásico de producto constante, <strong>x · y = k</strong>: cada compra de un activo cambia la proporción y, con ella, el precio.</p></section>
  <section><h2>2. Quién se queda con el valor</h2><p>Cada intercambio paga una comisión. En un AMM esa comisión no va a un intermediario: se reparte, en proporción, entre quienes aportaron el capital — los <strong>proveedores de liquidez</strong> (LP). Cualquiera con una billetera puede serlo, sin permiso y sin mínimo institucional.</p></section>
  <CompareTable highlight={1} cols={["Creador de mercado tradicional", "Proveedor de liquidez on-chain"]} rows={[
    { label: "Acceso", cells: ["Cerrado: capital, licencias", "Abierto a cualquier billetera"] },
    { label: "Quién cobra", cells: ["La firma retiene el spread", "Las comisiones van a los LP"] },
    { label: "Custodia", cells: ["Intermediario", "Contrato público; posición a tu nombre"] },
    { label: "Transparencia", cells: ["Libros privados", "Cada operación es verificable"] },
    { label: "Riesgo", cells: ["Inventario y mercado", "Precio, pérdida no permanente, contrato"] },
  ]} />
  <section><h2>3. Liquidez nueva: el problema que resuelven los pools</h2><p>Las monedas nuevas o de menor tamaño suelen tener mercados poco profundos: una orden de unos miles de dólares puede mover el precio varios puntos. Cada dólar nuevo depositado en un pool <strong>profundiza el mercado</strong>, reduce el slippage para todos y, a cambio, cobra parte de las comisiones. Es un intercambio justo: el usuario que necesita operar paga por la liquidez, y quien la aporta recibe ese pago mientras la mantiene en el sistema.</p></section>
  <section><h2>4. Liquidez concentrada: más trabajo por cada dólar</h2><p>En el modelo clásico el capital se reparte entre precio cero e infinito, así que la mayor parte nunca se usa. La <strong>liquidez concentrada</strong> (por ejemplo, los modelos DLMM, que dividen el precio en tramos o <em>bins</em>) permite colocar el capital solo alrededor del precio actual. Con la misma fórmula, un rango de ±5 % ofrece unas 20 veces más profundidad por dólar que el rango completo.</p></section>
  <BarChart title="Profundidad por dólar según el rango (rango completo = 1×)" bars={RANGES.map((r) => ({ label: r.es, value: r.v }))} note="Cálculo teórico con la fórmula de producto constante: 1 / (1 − √((1−r)/(1+r))). Ilustrativo, no es un rendimiento." />
  <p>El precio de esa eficiencia: si el mercado sale del rango, la posición deja de cobrar comisiones y queda toda en uno de los dos activos. Por eso los rangos estrechos requieren <strong>recentrar</strong> con frecuencia.</p>
  <section><h2>5. La ecuación de rentabilidad</h2><p>De forma simplificada, el rendimiento anual estimado por comisiones (APR simple) es:</p><p className="rounded-xl bg-muted p-3 text-center font-mono text-sm">APR ≈ (comisiones 24 h ÷ liquidez del pool) × 365 × 100</p><p>Lo que manda es la relación <strong>volumen / liquidez</strong>: un pool con mucho volumen para poco capital paga más por dólar. En contra juega la <strong>pérdida no permanente</strong>: frente a simplemente guardar los dos activos, la posición pierde valor relativo cuando el precio se mueve.</p></section>
  <StatCards items={[{ value: `−${il(1.5)} %`, label: "pérdida no permanente si el precio sube 50 % (rango completo)" }, { value: `−${il(2)} %`, label: "si el precio se duplica (rango completo)" }]} />
  <p className="text-sm text-muted-foreground">Fórmula: 2√k / (1 + k) − 1, donde k es el cambio de precio. En rangos concentrados el efecto se amplifica dentro del rango. La estrategia es rentable cuando las comisiones cobradas superan esa pérdida.</p>
  <section><h2>6. Automatizar sin ceder la custodia</h2><p>Gestionar rangos a mano exige vigilar el precio, retirar, recomponer y volver a depositar. Las <strong>bóvedas inteligentes</strong> automatizan ese trabajo: el piloto automático recentra la posición cuando sale de rango y cosecha las comisiones, mientras la posición sigue en contratos públicos a nombre de tu propia billetera y cada movimiento queda verificable en el explorador.</p><p>Ninguna automatización elimina el riesgo de mercado. Las tasas son estimaciones que cambian con el volumen, y existe la posibilidad de perder capital.</p></section>
</>;

const EN = <>
  <p>Every market needs something you rarely see: <strong>liquidity</strong> — capital available the moment someone wants to buy or sell. Without it, every trade moves the price against the user (<em>slippage</em>), spreads widen and the market stops being useful.</p>
  <section><h2>1. From order books to AMMs</h2><p>In traditional finance, liquidity comes from professional market makers posting buy and sell orders on an order book. They capture the <em>spread</em>, and access is closed: it takes capital, licenses and infrastructure.</p><p>On a blockchain, updating thousands of orders per second is expensive. The answer was <strong>AMMs</strong> (Automated Market Makers): a public contract holds two assets and sets the price with a formula. In the classic constant-product model, <strong>x · y = k</strong>: each purchase changes the ratio and, with it, the price.</p></section>
  <section><h2>2. Who keeps the value</h2><p>Every swap pays a fee. In an AMM that fee doesn't go to an intermediary: it is shared, pro rata, among those who supplied the capital — the <strong>liquidity providers</strong> (LPs). Anyone with a wallet can be one, permissionlessly, with no institutional minimum.</p></section>
  <CompareTable highlight={1} cols={["Traditional market maker", "On-chain liquidity provider"]} rows={[
    { label: "Access", cells: ["Closed: capital, licenses", "Open to any wallet"] },
    { label: "Who earns", cells: ["The firm keeps the spread", "Fees go to LPs"] },
    { label: "Custody", cells: ["Intermediary", "Public contract; position in your name"] },
    { label: "Transparency", cells: ["Private books", "Every trade is verifiable"] },
    { label: "Risk", cells: ["Inventory and market", "Price, impermanent loss, contract"] },
  ]} />
  <section><h2>3. New liquidity: the problem pools solve</h2><p>New or smaller coins tend to have shallow markets: an order of a few thousand dollars can move the price several points. Every new dollar deposited in a pool <strong>deepens the market</strong>, lowers slippage for everyone and, in return, earns part of the fees. It's a fair exchange: the user who needs to trade pays for liquidity, and whoever provides it is paid while keeping it in the system.</p></section>
  <section><h2>4. Concentrated liquidity: more work per dollar</h2><p>In the classic model capital is spread from zero to infinity, so most of it never gets used. <strong>Concentrated liquidity</strong> (for example DLMM models, which split price into ranges or <em>bins</em>) lets capital sit only around the current price. With the same math, a ±5% range provides about 20 times more depth per dollar than the full range.</p></section>
  <BarChart title="Depth per dollar by range (full range = 1×)" bars={RANGES.map((r) => ({ label: r.en, value: r.v }))} note="Theoretical constant-product calculation: 1 / (1 − √((1−r)/(1+r))). Illustrative, not a yield." />
  <p>The cost of that efficiency: if the market leaves the range, the position stops earning fees and ends up entirely in one of the two assets. That's why narrow ranges need frequent <strong>recentering</strong>.</p>
  <section><h2>5. The profitability equation</h2><p>Simplified, the estimated annual fee yield (simple APR) is:</p><p className="rounded-xl bg-muted p-3 text-center font-mono text-sm">APR ≈ (24h fees ÷ pool liquidity) × 365 × 100</p><p>What matters is the <strong>volume / liquidity</strong> ratio: a pool with lots of volume for little capital pays more per dollar. Working against it is <strong>impermanent loss</strong>: compared with simply holding both assets, the position loses relative value when the price moves.</p></section>
  <StatCards items={[{ value: `−${il(1.5)}%`, label: "impermanent loss if price rises 50% (full range)" }, { value: `−${il(2)}%`, label: "if price doubles (full range)" }]} />
  <p className="text-sm text-muted-foreground">Formula: 2√k / (1 + k) − 1, where k is the price change. In concentrated ranges the effect is amplified within the range. The strategy pays off when fees earned exceed that loss.</p>
  <section><h2>6. Automation without giving up custody</h2><p>Managing ranges by hand means watching the price, withdrawing, rebalancing and redepositing. <strong>Smart vaults</strong> automate that work: the autopilot recenters the position when it leaves the range and harvests fees, while the position stays in public contracts owned by your own wallet and every move is verifiable on the explorer.</p><p>No automation removes market risk. Rates are estimates that change with volume, and you can lose capital.</p></section>
</>;
