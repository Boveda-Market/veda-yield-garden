import { createFileRoute } from "@tanstack/react-router";
import { PostLayout, postHead } from "@/components/blog-layout";
import { BarChart, Callout, CompareTable, Donut, StatCards } from "@/components/blog-visuals";

const P = "/blog/hackeo-binance-llaves";
export const Route = createFileRoute("/blog/hackeo-binance-llaves")({ staticData: { sitemap: true }, head: () => postHead("es", P), component: Page });

const N1 = "https://internationalfinance.com/currency/binance-hack-us-seeks-to-recover-over-usd-1-billion-in-crypto-assets/";
const G1 = "https://trends.google.com/trends/explore?q=binance%20hack";
const GN = "https://www.google.com/search?q=Binance&tbm=nws";

const A = ({ href, children }: { href: string; children: string }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;

export function Page() {
  return <PostLayout path={P} es={ES} enBody={EN} />;
}

const ES = <>
  <p>Imagina que guardas tus ahorros en la caja fuerte más grande de la ciudad, junto a los de millones de personas. Suena seguro, ¿verdad? Ahora piensa en quién más mira esa caja fuerte: los ladrones más preparados del mundo.</p>
  <p>Soy Sofía Holdd y hoy quiero hablarte de una noticia que lo deja clarísimo: cuando le das tus llaves a otro, tu dinero pasa a depender de qué tan bien las cuide.</p>
  <section><h2>Lo que pasó: más de mil millones de dólares en la mira</h2><p>Según International Finance, el Departamento de Justicia de Estados Unidos presentó una demanda civil para recuperar más de 1,000 millones de dólares en criptomonedas que, presuntamente, fueron robados por ciberatacantes de Corea del Norte en un hackeo reciente a Binance, la plataforma de criptomonedas más grande del mundo (<A href={N1}>International Finance</A>).</p><p>El copresidente de Binance, Richard Teng, dijo que la empresa ya había repuesto el 95% de los activos afectados con su fondo de emergencia para usuarios (SAFU) y otras reservas, y que el 5% restante son monedas menos líquidas que aún intentan recuperar. Sus palabras: «Es una lección dolorosa. Asumimos la responsabilidad».</p><p>La misma nota recuerda que el FBI atribuye a Corea del Norte pérdidas de más de 6,000 millones de dólares en criptomonedas, algo que el país niega.</p></section>
  <StatCards items={[{ value: "+$1,000M", label: "lo que EE. UU. busca recuperar, según International Finance" }, { value: "95%", label: "repuesto por Binance con su fondo de emergencia, según su copresidente" }, { value: "+$6,000M", label: "pérdidas atribuidas a Corea del Norte por el FBI" }]} />
  <Donut percent={95} title="Ya repuesto por Binance" label="Parte de los activos afectados que la empresa dice haber cubierto con su fondo de emergencia y otras reservas." note="Fuente: International Finance" />
  <BarChart title="Millones de dólares en juego" unit="$" bars={[{ label: "EE. UU. busca recuperar", value: 1000 }, { label: "Atribuido a Corea del Norte", value: 6000 }]} note="Millones de dólares, según International Finance y la cifra del FBI que cita la misma nota." />
  <section><h2>Lo que dice Google: «¿mi dinero está seguro?»</h2><p>Cada vez que una plataforma grande sufre un ataque, las búsquedas se llenan de la misma duda: «¿Binance es seguro?», «¿cómo saco mi dinero del exchange?» (puedes ver la cobertura en <A href={GN}>Google Noticias</A> y el interés en <A href={G1}>Google Trends</A>). Es la reacción de alguien que de pronto descubre que su saldo no estaba en sus manos.</p></section>
  <section><h2>La trampa de la caja fuerte compartida</h2><p><strong>Un blanco gigante:</strong> cuando millones de personas guardan su dinero en las mismas cuentas, atacarlas vale la pena. Mil millones en un solo lugar atraen a los mejores ladrones.</p><p><strong>Un saldo que es una promesa:</strong> en una plataforma que custodia tu dinero, lo que ves en pantalla es lo que te deben. Si hay un hackeo, una pausa de retiros o una quiebra, dependes de fondos de emergencia, de su buena voluntad o de demandas que tardan años.</p><p><strong>Tus datos en su vitrina:</strong> cada depósito, retiro y saldo queda en sus registros, que también pueden filtrarse.</p></section>
  <section><h2>«Si no son tus llaves, no es tu dinero»</h2><p>Una billetera digital propia funciona distinto: tu dinero está a tu nombre y solo se mueve con tu firma. No hay una bóveda central con el dinero de todos esperando a ser asaltada; para llegar a tus fondos tendrían que atacarte a ti, y aun así necesitarían tu autorización.</p><p>Eso también cuida tu privacidad: no hay un intermediario guardando la lista de lo que haces con tu dinero.</p></section>
  <section><h2>Cómo lo resolvemos en Bóveda</h2><p>En Bóveda Market tu billetera se crea en un minuto con Google, pero las llaves no se quedan con nosotros: están protegidas con Privy, un sistema de seguridad que separa y resguarda tus llaves, y cada movimiento lo autorizas tú con Face ID o tu huella. Bóveda nunca recibe ni custodia tu dinero.</p><p>Hablemos claro: ningún sistema elimina todo el riesgo. Cuidar tu acceso sigue siendo tu responsabilidad, las bóvedas pueden perder valor y las ganancias no están garantizadas.</p></section>
  <CompareTable highlight={1} cols={["Plataforma que custodia", "Tu propia billetera"]} rows={[
    { label: "Quién tiene las llaves", cells: ["La empresa", "Tú"] },
    { label: "Si hackean la plataforma", cells: ["Tu saldo depende de sus reservas", "No hay caja común que vaciar"] },
    { label: "Para mover dinero", cells: ["Ellos deciden si hay retiros", "Solo con tu firma"] },
    { label: "Tus movimientos", cells: ["Guardados en sus registros", "Sin intermediario que los guarde"] },
  ]} />
  <section><h2>El consejo de Sofía</h2><p>Que una empresa sea grande no significa que tu dinero esté a salvo; a veces significa lo contrario.</p><Callout>La tranquilidad de verdad es saber que nadie, ni siquiera la app que usas, puede mover tu dinero sin ti.</Callout></section>
</>;

const EN = <>
  <p>Imagine keeping your savings in the biggest safe in town, alongside millions of other people's. Sounds secure, right? Now think about who else is watching that safe: the best-prepared thieves in the world.</p>
  <p>I'm Sofía Holdd, and today I want to talk about a news story that makes it crystal clear: when you hand your keys to someone else, your money depends on how well they guard them.</p>
  <section><h2>What happened: over a billion dollars at stake</h2><p>According to International Finance, the US Justice Department filed a civil claim to recover more than 1 billion dollars in crypto allegedly stolen by North Korean cyber actors in a recent hack of Binance, the world's largest crypto platform (<A href={N1}>International Finance</A>).</p><p>Binance Co-CEO Richard Teng said the company had already replenished 95% of the affected assets through its Secure Asset Fund for Users (SAFU) and other reserves, and that the remaining 5% are less liquid coins it is still working to restore. His words: “It's a painful lesson. We take responsibility for it.”</p><p>The same article notes that the FBI attributes more than 6 billion dollars in crypto losses to North Korea, which the country denies.</p></section>
  <StatCards items={[{ value: "$1B+", label: "what the US seeks to recover, per International Finance" }, { value: "95%", label: "replenished by Binance from its emergency fund, per its Co-CEO" }, { value: "$6B+", label: "losses the FBI attributes to North Korea" }]} />
  <Donut percent={95} title="Already replenished by Binance" label="Share of the affected assets the company says it covered with its emergency fund and other reserves." note="Source: International Finance" />
  <BarChart title="Billions in play, in millions" unit="$" bars={[{ label: "US seeks to recover", value: 1000 }, { label: "Attributed to North Korea", value: 6000 }]} note="Millions of dollars, per International Finance and the FBI figure quoted in the same article." />
  <section><h2>What Google says: “is my money safe?”</h2><p>Every time a big platform gets attacked, searches fill with the same doubt: “is Binance safe?”, “how do I get my money off the exchange?” (you can see the coverage on <A href={GN}>Google News</A> and the interest on <A href={G1}>Google Trends</A>). It's the reaction of someone who suddenly realizes their balance was never in their hands.</p></section>
  <section><h2>The shared-safe trap</h2><p><strong>A giant target:</strong> when millions of people keep their money in the same accounts, attacking them pays off. A billion in one place attracts the best thieves.</p><p><strong>A balance that is a promise:</strong> on a platform that holds your money, what you see on screen is what they owe you. After a hack, a withdrawal freeze or a bankruptcy, you depend on emergency funds, their goodwill or lawsuits that take years.</p><p><strong>Your data in their window:</strong> every deposit, withdrawal and balance sits in their records, which can also leak.</p></section>
  <section><h2>“Not your keys, not your money”</h2><p>Your own digital wallet works differently: your money is in your name and only moves with your signature. There's no central vault with everyone's money waiting to be robbed; to reach your funds they'd have to target you, and even then they'd need your approval.</p><p>That also protects your privacy: no middleman keeps a list of what you do with your money.</p></section>
  <section><h2>How we solve it at Bóveda</h2><p>At Bóveda Market your wallet is created in a minute with Google, but the keys don't stay with us: they're protected by Privy, a security system that splits and safeguards your keys, and you authorize every move with Face ID or your fingerprint. Bóveda never receives or holds your money.</p><p>Let's be clear: no system removes all risk. Protecting your access is still your responsibility, vaults can lose value and earnings aren't guaranteed.</p></section>
  <CompareTable highlight={1} cols={["Platform that holds it", "Your own wallet"]} rows={[
    { label: "Who holds the keys", cells: ["The company", "You"] },
    { label: "If the platform is hacked", cells: ["Your balance depends on its reserves", "No shared pot to empty"] },
    { label: "To move money", cells: ["They decide if withdrawals open", "Only with your signature"] },
    { label: "Your activity", cells: ["Stored in their records", "No middleman storing it"] },
  ]} />
  <section><h2>Sofía's advice</h2><p>A company being big doesn't mean your money is safe; sometimes it means the opposite.</p><Callout>Real peace of mind is knowing that nobody, not even the app you use, can move your money without you.</Callout></section>
</>;
