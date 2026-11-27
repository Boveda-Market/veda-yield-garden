import { createFileRoute } from "@tanstack/react-router";
import { PostLayout, postHead } from "@/components/blog-layout";
import { BarChart, CompareTable, StatCards } from "@/components/blog-visuals";

const P = "/blog/miedo-caida-bitcoin-holdear";
export const Route = createFileRoute("/blog/miedo-caida-bitcoin-holdear")({ staticData: { sitemap: true }, head: () => postHead("es", P), component: Page });

const Y1 = "https://finance.yahoo.com/markets/article/bitcoin-sinks-in-brutal-november-sell-off-as-broader-market-slides-143727717.html";
const Y2 = "https://finance.yahoo.com/markets/crypto/articles/bitcoin-breaks-below-60k-crypto-163559501.html";
const Y3 = "https://finance.yahoo.com/markets/crypto/articles/bitcoin-price-could-crash-39k-111504589.html";
const G1 = "https://cointelegraph.com/news/bitcoin-going-to-zero-searches-spike-extreme-fear";
const G2 = "https://www.coindesk.com/markets/2026/02/22/bitcoin-to-zero-searches-spike-in-the-u-s-but-the-bottom-signal-is-mixed";

const A = ({ href, children }: { href: string; children: string }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;

// Fear & Greed readings reported by Yahoo Finance (Nov 20, 2026 article).
const FEAR = [{ l: "Hace 1 mes", v: 51 }, { l: "Hace 1 semana", v: 18 }, { l: "20 nov", v: 9 }];
const FEAR_EN = ["1 month ago", "1 week ago", "Nov 20"];

export function Page() {
  return <PostLayout path={P} es={ES} enBody={EN} />;
}

const ES = <>
  <p>¿Abriste las noticias esta semana y sentiste un nudo en el estómago? No eres la única persona.</p>
  <p>Soy Sofía Holdd y hoy quiero hablarte del miedo. No del miedo a perder dinero, que es normal, sino del que nos venden los titulares y que termina decidiendo por nosotros.</p>
  <section><h2>Lo que dice Yahoo: el titular de pánico</h2><p>Yahoo Finanzas reporta que Bitcoin ronda los 59.000 dólares y va camino de su peor mes desde junio de 2022, con una caída de más del 20 % en noviembre (<A href={Y1}>Yahoo Finanzas</A>). Otros análisis ya hablan de que podría bajar hasta 39.000 (<A href={Y3}>Yahoo Finanzas</A>), y el índice de miedo y codicia del mercado llegó a 9 sobre 100: «miedo extremo» (<A href={Y2}>Yahoo Finanzas</A>).</p></section>
  <BarChart title="Índice de miedo y codicia (0 = pánico, 100 = euforia)" bars={FEAR.map((f) => ({ label: f.l, value: f.v }))} note="Lecturas citadas por Yahoo Finanzas, 20 de noviembre de 2026." />
  <section><h2>Lo que dice Google: lo que teclea la gente asustada</h2><p>Mientras la prensa grita, la gente busca. Según Google Trends, las búsquedas de «Bitcoin going to zero» (¿Bitcoin se va a cero?) llegaron a su nivel más alto desde la crisis de FTX en 2022 (<A href={G1}>Cointelegraph</A>). En EE. UU. la búsqueda «bitcoin zero» marcó un récord de 100 sobre 100, y picos parecidos en 2021 y 2022 coincidieron con suelos locales del precio, aunque eso no garantiza que se repita (<A href={G2}>CoinDesk</A>).</p></section>
  <StatCards items={[{ value: "9/100", label: "índice de miedo según Yahoo Finanzas: «miedo extremo»" }, { value: "100/100", label: "búsquedas récord de «bitcoin zero» en Google (EE. UU.)" }]} />
  <section><h2>El contraste: la paradoja del supermercado</h2><p>Si tu café favorito tiene un 40 % de descuento, no sales corriendo pensando que el café dejó de servir. Compras con calma. Con Bitcoin pasa lo contrario: cuando rompe récords todos quieren entrar, y cuando baja, Yahoo publica pánico y Google se llena de preguntas sobre si va a morir.</p><p>Ese contraste entre lo que grita la prensa y lo que busca la gente asustada es justo cuando quien ahorra con paciencia suele construir su posición, poco a poco y sin intentar adivinar el suelo exacto.</p></section>
  <section><h2>¿Qué puede pasar si baja o si sube?</h2><p><strong>Si sigue bajando:</strong> lo que compraste vale menos por un tiempo. Si usaste dinero que no necesitas para tus gastos, no estás obligado a vender, y puedes seguir sumando de a poco a precios más bajos. Pero puede seguir cayendo, y nadie sabe cuánto.</p><p><strong>Si vuelve a subir:</strong> lo acumulado con descuento recupera valor. Históricamente el mercado se ha recuperado tras sus peores rachas, pero el pasado no garantiza el futuro.</p></section>
  <section><h2>El verdadero problema: holdear a la antigua</h2><p>Durante años la receta fue: «compra Bitcoin, guárdalo y no lo mires en cinco años». Eso es holdear a la antigua, y tiene un problema enorme: <strong>tu dinero no produce nada mientras esperas</strong>.</p><p>Si el precio baja o se queda de lado durante ocho o doce meses, algo muy común, la única referencia que tienes es la gráfica en rojo. No entra ni un centavo. Y ese silencio es el que manda a tanta gente a Google a preguntar si Bitcoin va a morir, hasta que un mal día vende por cansancio en el peor momento.</p><p>El problema no es tener Bitcoin. <strong>El problema es tenerlo congelado.</strong></p></section>
  <section><h2>Por qué Bóveda hace más fácil esperar</h2><p>La Bóveda Bitcoin pone tu depósito a trabajar en los mercados públicos donde la gente cambia Bitcoin por dólares digitales todo el día. Cada cambio paga una pequeña comisión y una parte va a quienes aportan su dinero. Los días de nervios suelen traer más cambios, y por eso más comisiones.</p><p>Desde Mi Portafolio cosechas esas ganancias a <strong>dólares digitales</strong> con un toque, sin vender lo que dejaste trabajando, y el Piloto Automático cuida la posición por ti. Tú decides cuándo retirar, sin pantallas ni trading.</p><p>Hablemos claro: las ganancias cambian cada día, no están garantizadas, y el valor de tu depósito sube y baja con el mercado. Puede haber pérdida.</p></section>
  <CompareTable highlight={1} cols={["Holdear a la antigua", "Con la Bóveda Bitcoin"]} rows={[
    { label: "Mientras esperas", cells: ["Dinero quieto", "Trabajando en mercados públicos"] },
    { label: "Ingresos", cells: ["Ninguno hasta vender", "Comisiones variables, no garantizadas"] },
    { label: "Días de pánico", cells: ["Solo ves la gráfica en rojo", "Más cambios suelen dejar más comisiones"] },
    { label: "Tomar ganancias", cells: ["Hay que vender Bitcoin", "Cosechas a dólares digitales con un toque"] },
  ]} />
  <section><h2>El consejo de Sofía</h2><p>No intentes adivinar el suelo: nadie puede. Usa solo dinero que puedas dejar con paciencia, cierra Yahoo cuando grite y no tomes decisiones por lo que busca la multitud en Google. Y, sobre todo, no dejes tu dinero durmiendo la siesta.</p></section>
</>;

const EN = <>
  <p>Did you open the news this week and feel a knot in your stomach? You're not alone.</p>
  <p>I'm Sofía Holdd, and today I want to talk about fear. Not the normal fear of losing money, but the fear headlines sell us, which ends up deciding for us.</p>
  <section><h2>What Yahoo says: the panic headline</h2><p>Yahoo Finance reports Bitcoin hovering near $59,000 and on pace for its worst month since June 2022, down more than 20% in November (<A href={Y1}>Yahoo Finance</A>). Other analyses already talk about a possible drop to $39,000 (<A href={Y3}>Yahoo Finance</A>), and the market's fear and greed index hit 9 out of 100: “extreme fear” (<A href={Y2}>Yahoo Finance</A>).</p></section>
  <BarChart title="Fear and greed index (0 = panic, 100 = euphoria)" bars={FEAR.map((f, i) => ({ label: FEAR_EN[i]!, value: f.v }))} note="Readings cited by Yahoo Finance, November 20, 2026." />
  <section><h2>What Google says: what scared people type</h2><p>While the press shouts, people search. According to Google Trends, searches for “Bitcoin going to zero” reached their highest level since the 2022 FTX crisis (<A href={G1}>Cointelegraph</A>). In the US, “bitcoin zero” hit a record 100 out of 100, and similar spikes in 2021 and 2022 lined up with local price bottoms, though that's no guarantee it repeats (<A href={G2}>CoinDesk</A>).</p></section>
  <StatCards items={[{ value: "9/100", label: "fear index per Yahoo Finance: “extreme fear”" }, { value: "100/100", label: "record Google searches for “bitcoin zero” (US)" }]} />
  <section><h2>The contrast: the supermarket paradox</h2><p>If your favorite coffee is 40% off, you don't run away thinking coffee stopped being good. You buy calmly. With Bitcoin it's the opposite: at record highs everyone wants in, and when it drops, Yahoo publishes panic and Google fills with questions about whether it will die.</p><p>That contrast between what the press shouts and what scared people search is often when patient savers build their position, little by little, without trying to guess the exact bottom.</p></section>
  <section><h2>What can happen if it falls or rises?</h2><p><strong>If it keeps falling:</strong> what you bought is worth less for a while. If you used money you don't need for your expenses, you're not forced to sell, and you can keep adding little by little at lower prices. But it can keep falling, and nobody knows how far.</p><p><strong>If it rises again:</strong> what you gathered at a discount regains value. Historically the market has recovered after its worst stretches, but the past doesn't guarantee the future.</p></section>
  <section><h2>The real problem: old-school holding</h2><p>For years the recipe was: “buy Bitcoin, store it and don't look for five years.” That's old-school holding, and it has a huge problem: <strong>your money produces nothing while you wait</strong>.</p><p>If the price falls or moves sideways for eight or twelve months, which is very common, your only reference is a red chart. Not a cent comes in. That silence is what sends so many people to Google asking if Bitcoin will die, until one bad day they sell out of exhaustion at the worst moment.</p><p>The problem isn't owning Bitcoin. <strong>The problem is keeping it frozen.</strong></p></section>
  <section><h2>Why Bóveda makes waiting easier</h2><p>The Bitcoin Vault puts your deposit to work in the public markets where people swap Bitcoin for digital dollars all day. Every swap pays a small fee and part of it goes to those who supply their money. Nervous days tend to bring more swaps, and therefore more fees.</p><p>From My Portfolio you harvest those earnings to <strong>digital dollars</strong> with one tap, without selling what you left working, and Autopilot looks after the position for you. You decide when to withdraw, no screens or trading.</p><p>Let's be clear: earnings change daily, aren't guaranteed, and your deposit's value rises and falls with the market. Loss is possible.</p></section>
  <CompareTable highlight={1} cols={["Old-school holding", "With the Bitcoin Vault"]} rows={[
    { label: "While you wait", cells: ["Idle money", "Working in public markets"] },
    { label: "Income", cells: ["None until you sell", "Variable fees, not guaranteed"] },
    { label: "Panic days", cells: ["You only see a red chart", "More swaps tend to leave more fees"] },
    { label: "Taking profits", cells: ["You must sell Bitcoin", "Harvest to digital dollars in one tap"] },
  ]} />
  <section><h2>Sofía's advice</h2><p>Don't try to guess the bottom: nobody can. Use only money you can leave with patience, close Yahoo when it shouts and don't decide based on what the crowd searches on Google. Above all, don't let your money nap.</p></section>
</>;
