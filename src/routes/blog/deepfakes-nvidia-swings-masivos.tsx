import { createFileRoute } from "@tanstack/react-router";
import { PostLayout, postHead } from "@/components/blog-layout";
import { Callout, Checklist, CompareTable, StatCards } from "@/components/blog-visuals";

const P = "/blog/deepfakes-nvidia-swings-masivos";
export const Route = createFileRoute("/blog/deepfakes-nvidia-swings-masivos")({ staticData: { sitemap: true }, head: () => postHead("es", P), component: Page });

const Y1 = "https://es-us.finanzas.yahoo.com/noticias/regreso-jensen-huang-nvidia-desata-113449154.html";
const G1 = "https://trends.google.com/trends/explore?q=nvidia%20stock";
const GN = "https://www.google.com/search?q=Nvidia+Jensen+Huang&tbm=nws";

const A = ({ href, children }: { href: string; children: string }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;

export function Page() {
  return <PostLayout path={P} es={ES} enBody={EN} />;
}

const ES = <>
  <p>Un video aparece en tu teléfono: el jefe de la empresa más famosa de la inteligencia artificial sale de un ataúd con la frase «Es hora de la revancha». Es falso, pero se ve real. Y mientras millones lo comparten, los mercados intentan adivinar qué es verdad.</p>
  <p>Soy Sofía Holdd y hoy quiero hablarte de cómo estas noticias y videos sacuden los precios, y de cómo puedes vivir esos sacudones sin perder la calma.</p>
  <section><h2>Lo que cuenta Yahoo Finanzas</h2><p>Según Yahoo Finanzas, Jensen Huang renunció como director ejecutivo de Nvidia el 12 de noviembre en medio de un escándalo de adulterio, presunto espionaje y contrabando. Días después volvió al cargo tras una intervención del presidente Donald Trump, y Nvidia explicó que lo restituyó al recibir información del gobierno de que no representa un riesgo para la seguridad nacional (<A href={Y1}>Yahoo Finanzas</A>).</p><p>Su regreso desató una nueva ola de videos falsos hechos con IA en redes como X: Huang como rey que vuelve, como gánster de película o en escenas que nunca ocurrieron. Un experto de la Universidad de Nueva York recordó que estos montajes se usan para difundir desinformación, aunque muchos solo buscan hacer reír.</p></section>
  <StatCards items={[{ value: "12 nov.", label: "Huang renuncia como director ejecutivo, según Yahoo Finanzas" }, { value: "1 lunes", label: "le bastó para volver tras la intervención de Trump" }, { value: "IA", label: "la misma tecnología que impulsa ahora lo convierte en blanco de videos falsos" }]} />
  <section><h2>Lo que busca la gente en Google</h2><p>Cuando una empresa gigante vive días así, las búsquedas se llenan de nervios: «¿vendo mis acciones de Nvidia?», «¿por qué sube y baja tanto?», «¿ese video es real?» (puedes ver la cobertura en <A href={GN}>Google Noticias</A> y el interés en <A href={G1}>Google Trends</A>). Es la reacción de quien siente que el precio se mueve más rápido de lo que alcanza a entender.</p></section>
  <section><h2>Por qué una noticia (o un video falso) mueve tanto el precio</h2><p><strong>Todo pasa en segundos:</strong> un rumor o un video circula, programas automáticos y personas reaccionan casi al mismo tiempo, y el precio da un salto o un desplome antes de que nadie confirme nada.</p><p><strong>Luego llega el rebote:</strong> cuando se aclara la historia, muchos corren en sentido contrario. Ese ir y venir es lo que llamamos <em>swings</em> masivos.</p><p><strong>La trampa:</strong> quien intenta adivinar cada ola suele comprar en la euforia y vender en el miedo, justo al revés de lo que quería.</p></section>
  <section><h2>Otra forma de mirar los sacudones</h2><p>En una bóveda de liquidez concentrada no apuestas a que el precio suba o baje: pones tu dinero a disposición para que otras personas cambien monedas, y cada cambio deja una pequeña comisión. Cuando hay nervios y mucha gente compra y vende, hay más cambios, y por eso más comisiones repartidas entre quienes aportan liquidez.</p><p>Hablemos claro: si el precio se aleja mucho, tu posición puede quedar fuera de rango y dejar de generar intereses, y el valor de tu bóveda también puede bajar. Las ganancias no están garantizadas.</p></section>
  <section><h2>El Piloto Automático: tu calma en los días locos</h2><p>Para que no tengas que estar pegado a la pantalla, el Piloto Automático vigila tu bóveda: si el precio pasa unos minutos fuera de rango, la vuelve a centrar; cuando el precio baja, guarda las ganancias como dólares digitales disponibles en tu Billetera, y cuando sube, las reinvierte solo (auto-compound). Tu dinero sigue en tu propia billetera y nadie más puede retirarlo.</p></section>
  <CompareTable highlight={1} cols={["Intentar adivinar cada ola", "Bóveda con Piloto Automático"]} rows={[
    { label: "Ante un video falso", cells: ["Reaccionas con miedo o euforia", "No tienes que decidir en segundos"] },
    { label: "Cuando hay mucho movimiento", cells: ["Más riesgo de comprar caro y vender barato", "Más cambios pueden generar más comisiones"] },
    { label: "Si el precio se aleja", cells: ["Decides tú, a contrarreloj", "El Piloto vuelve a centrar la posición"] },
    { label: "Tu tiempo", cells: ["Pegado a la pantalla", "Revisas cuando quieras"] },
  ]} />
  <section><h2>El consejo de Sofía</h2><Checklist title="Antes de compartir o decidir, haz esta revisión" items={["Busca la noticia en la fuente original, no solo en el video", "Mira la fecha: muchos montajes reciclan escenas viejas", "Desconfía de lo que te urge a actuar «ahora mismo»", "Si el monto es importante, duerme una noche antes de moverlo"]} /><Callout>Los mercados se mueven por emociones, pero tu plan no tiene por qué hacerlo.</Callout></section>
</>;

const EN = <>
  <p>A video pops up on your phone: the boss of the most famous AI company climbs out of a coffin with the caption “Time for revenge.” It's fake, but it looks real. And while millions share it, markets try to guess what's true.</p>
  <p>I'm Sofía Holdd, and today I want to talk about how these stories and videos shake prices, and how you can live through those swings without losing your calm.</p>
  <section><h2>What Yahoo Finance reports</h2><p>According to Yahoo Finance, Jensen Huang resigned as Nvidia's CEO on November 12 amid a scandal involving adultery, alleged espionage and smuggling. Days later he returned after an intervention by President Donald Trump, and Nvidia said it reinstated him after receiving information from the US government that he poses no national security risk (<A href={Y1}>Yahoo Finance</A>).</p><p>His comeback set off a new wave of AI-made fake videos on networks like X: Huang as a returning king, as a movie gangster or in scenes that never happened. A New York University expert noted these deepfakes are used to spread disinformation, though many only aim to get a laugh.</p></section>
  <StatCards items={[{ value: "Nov 12", label: "Huang resigns as CEO, per Yahoo Finance" }, { value: "1 Monday", label: "was all it took for him to return after Trump's intervention" }, { value: "AI", label: "the same technology he drives now makes him a deepfake target" }]} />
  <section><h2>What people search on Google</h2><p>When a giant company goes through days like these, searches fill with nerves: “should I sell my Nvidia stock?”, “why does it swing so much?”, “is that video real?” (you can see the coverage on <A href={GN}>Google News</A> and the interest on <A href={G1}>Google Trends</A>). It's the reaction of someone who feels the price moves faster than they can understand.</p></section>
  <section><h2>Why a story (or a fake video) moves the price so much</h2><p><strong>It all happens in seconds:</strong> a rumor or video spreads, automated programs and people react almost at once, and the price jumps or drops before anyone confirms anything.</p><p><strong>Then comes the rebound:</strong> once the story is cleared up, many rush the other way. That back-and-forth is what we call massive swings.</p><p><strong>The trap:</strong> whoever tries to guess every wave usually buys in euphoria and sells in fear, exactly the opposite of what they wanted.</p></section>
  <section><h2>Another way to look at the swings</h2><p>In a concentrated liquidity vault you don't bet on the price going up or down: you make your money available for other people to swap coins, and each swap leaves a small fee. When nerves run high and many people buy and sell, there are more swaps, and so more fees shared among those who provide liquidity.</p><p>Let's be clear: if the price moves far away, your position can go out of range and stop earning interest, and your vault's value can also drop. Earnings aren't guaranteed.</p></section>
  <section><h2>Autopilot: your calm on crazy days</h2><p>So you don't have to stay glued to the screen, Autopilot watches your vault: if the price spends a few minutes out of range, it recenters it; when the price falls, it keeps the earnings as digital dollars available in your Wallet, and when it rises, it reinvests them on its own (auto-compound). Your money stays in your own wallet and nobody else can withdraw it.</p></section>
  <CompareTable highlight={1} cols={["Trying to guess every wave", "Vault with Autopilot"]} rows={[
    { label: "Facing a fake video", cells: ["You react with fear or euphoria", "No need to decide in seconds"] },
    { label: "When there's lots of movement", cells: ["More risk of buying high and selling low", "More swaps can generate more fees"] },
    { label: "If the price moves away", cells: ["You decide, against the clock", "Autopilot recenters the position"] },
    { label: "Your time", cells: ["Glued to the screen", "Check whenever you want"] },
  ]} />
  <section><h2>Sofía's advice</h2><Checklist title="Before you share or decide, run this check" items={["Look for the story in the original source, not just the video", "Check the date: many fakes recycle old footage", "Distrust anything urging you to act “right now”", "If the amount matters, sleep on it before moving it"]} /><Callout>Markets move on emotions, but your plan doesn't have to.</Callout></section>
</>;
