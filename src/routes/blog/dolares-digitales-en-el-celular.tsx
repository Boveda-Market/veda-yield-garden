import { createFileRoute } from "@tanstack/react-router";
import { PostLayout, postHead } from "@/components/blog-layout";
import { BarChart, CompareTable, Donut, Figure, StatCards } from "@/components/blog-visuals";
import photo from "@/assets/blog-dolares-celular.jpg";

// $1,000 kept idle, purchasing power with an assumed 3% yearly inflation (illustrative).
const IDLE = [0, 1, 2, 3, 4, 5].map((y) => Math.round(1000 / 1.03 ** y));

const P = "/blog/dolares-digitales-en-el-celular";
export const Route = createFileRoute("/blog/dolares-digitales-en-el-celular")({ staticData: { sitemap: true }, head: () => postHead("es", P), component: Page });

const CHAIN = "https://www.chainalysis.com/blog/latin-america-crypto-adoption-2026/";
const BLOOM = "https://www.bloomberg.com/news/articles/2026-11-13/stablecoins-are-becoming-crypto-s-killer-app-across-latin-america";

export function Page() {
  return <PostLayout path={P} es={ES} enBody={EN} />;
}

const ES = <>
  <Figure src={photo} alt="Mujer en un café mostrando una app de ahorro en su celular" caption="Ahorrar en dólares ya no necesita un banco en el extranjero: basta un celular." />
  <p>¿Alguna vez calculaste cuánto te cuesta realmente tener tu dinero en el banco?</p>
  <p>Entre comisiones de mantenimiento, límites para transferir y la inflación de cada mes comiéndose lo que guardaste, ahorrar a veces se siente como remar contra la corriente. Y si intentas comprar dólares para protegerte, te toca lidiar con filas, tipos de cambio abusivos o restricciones que no tienen mucho sentido.</p>
  <p>Por eso está pasando algo muy curioso en toda la región: millones de personas empezaron a usar <strong>dólares digitales</strong> en su teléfono. No para hacer apuestas raras ni para volverse millonarias de la noche a la mañana, sino por algo mucho más básico: <strong>cuidar su dinero</strong>.</p>
  <section><h2>Los números lo confirman</h2><p>Según el informe de adopción 2026 de Chainalysis, la actividad cripto en Latinoamérica creció un 9,8 % aun en un año difícil para los mercados, y los dólares digitales ya representan el 32 % del dinero que cruza fronteras en la región (<a href={CHAIN} target="_blank" rel="noopener noreferrer">Chainalysis</a>). Bloomberg lo resumió así: el gran invento de cripto en Latinoamérica resultó ser… el dólar (<a href={BLOOM} target="_blank" rel="noopener noreferrer">Bloomberg</a>).</p></section>
    <StatCards items={[{ value: "+9,8 %", label: "crecimiento de la actividad cripto en Latinoamérica" }, { value: "32 %", label: "del dinero que cruza fronteras ya viaja en dólares digitales" }]} />
  <Donut percent={32} title="Envíos entre países" label="Parte del dinero que cruza fronteras en la región que ya se mueve en dólares digitales." note="Fuente: Chainalysis 2026" />
  <section><h2>¿Qué tiene de diferente un dólar digital?</h2><p>Imagina tener dólares que son 100 % tuyos. No dependen del horario de una sucursal ni del humor de un cajero. Los tienes en una aplicación, valen lo mismo que un billete verde y puedes moverlos a cualquier hora, fines de semana incluidos, o enviarlos a quien quieras en segundos.</p><p>El más conocido se llama <strong>USDC</strong>: lo emite la empresa Circle, que lo respalda con efectivo y bonos del Tesoro de EE. UU. y publica informes de esas reservas.</p></section>
  <CompareTable highlight={2} cols={["Banco tradicional", "Dólares en el celular", "Bóveda inteligente"]} rows={[
    { label: "Horario", cells: ["Horario de sucursal", "24/7", "24/7"] },
    { label: "Enviar a otro país", cells: ["Días y comisiones", "Segundos", "Retiras a dólares y envías"] },
    { label: "Intereses", cells: ["Bajos o ninguno", "Ninguno", "Variables, no garantizados"] },
    { label: "Riesgo", cells: ["Inflación local", "Inflación del dólar", "Mercado; puede haber pérdida"] },
  ]} />
  <section><h2>El verdadero truco: no dejarlos quietos</h2><p>Guardar dólares debajo del colchón (o parados en una cuenta) te protege de la moneda local, sí. Pero el propio dólar también pierde un poquito de valor con los años.</p></section>
  <BarChart unit="$" title="Lo que compran $1.000 guardados quietos" bars={IDLE.map((v, i) => ({ label: i ? `Año ${i}` : "Hoy", value: v }))} note="Ejemplo ilustrativo con una inflación supuesta del 3 % anual; no es una proyección." />
  <section><p>Aquí entran las <strong>bóvedas inteligentes</strong>. En vez de que tu dinero duerma la siesta, se conecta a los mercados donde la gente cambia monedas todo el día. Cada vez que alguien hace un cambio, paga una pequeña comisión, y una parte va para quienes ponen su dinero ahí. Tú no tienes que estar pegado a la pantalla ni aprender trading: el sistema lo hace en segundo plano.</p><p>Eso sí, hablemos claro: los intereses cambian todos los días, no están garantizados y existe riesgo de pérdida. Por eso conviene empezar con poco.</p></section>
  <section><h2>La regla de oro</h2><p>No necesitas miles de dólares ni ser experto. Puedes probar con lo que gastarías en una salida a cenar, ver cómo van entrando las ganancias y retirar tus dólares cuando tú decidas.</p><p>Al final del día, tu dinero debería trabajar para ti, no al revés.</p></section>
</>;

const EN = <>
  <Figure src={photo} alt="Woman at a café showing a savings app on her phone" caption="Saving in dollars no longer needs a bank abroad: a phone is enough." />
  <p>Have you ever worked out how much it really costs you to keep your money in the bank?</p>
  <p>Between maintenance fees, transfer limits and monthly inflation eating into your savings, saving can feel like rowing against the current. And if you try to buy dollars to protect yourself, you deal with lines, bad exchange rates or restrictions that make little sense.</p>
  <p>That's why something curious is happening across the region: millions of people started using <strong>digital dollars</strong> on their phone. Not for wild bets or to get rich overnight, but for something much more basic: <strong>taking care of their money</strong>.</p>
  <section><h2>The numbers back it up</h2><p>According to Chainalysis' 2026 adoption report, crypto activity in Latin America grew 9.8% even in a tough year for markets, and digital dollars now account for 32% of money crossing borders in the region (<a href={CHAIN} target="_blank" rel="noopener noreferrer">Chainalysis</a>). Bloomberg put it this way: crypto's killer app in Latin America turned out to be… the dollar (<a href={BLOOM} target="_blank" rel="noopener noreferrer">Bloomberg</a>).</p></section>
    <StatCards items={[{ value: "+9.8%", label: "growth in crypto activity in Latin America" }, { value: "32%", label: "of money crossing borders now travels as digital dollars" }]} />
  <Donut percent={32} title="Cross-border transfers" label="Share of money crossing borders in the region that already moves as digital dollars." note="Source: Chainalysis 2026" />
  <section><h2>What makes a digital dollar different?</h2><p>Imagine dollars that are 100% yours. They don't depend on branch hours or a teller's mood. They live in an app, are worth the same as a paper bill, and you can move them at any hour, weekends included, or send them to anyone in seconds.</p><p>The best known is <strong>USDC</strong>: issued by Circle, backed by cash and US Treasury bills, with regular reports on those reserves.</p></section>
  <CompareTable highlight={2} cols={["Traditional bank", "Dollars on your phone", "Smart vault"]} rows={[
    { label: "Hours", cells: ["Branch hours", "24/7", "24/7"] },
    { label: "Send abroad", cells: ["Days and fees", "Seconds", "Withdraw to dollars and send"] },
    { label: "Earnings", cells: ["Low or none", "None", "Variable, not guaranteed"] },
    { label: "Risk", cells: ["Local inflation", "Dollar inflation", "Market; loss is possible"] },
  ]} />
  <section><h2>The real trick: don't leave them idle</h2><p>Keeping dollars under the mattress (or sitting in an account) protects you from your local currency, yes. But the dollar itself also loses a little value over the years.</p></section>
  <BarChart unit="$" title="What $1,000 kept idle can buy" bars={IDLE.map((v, i) => ({ label: i ? `Year ${i}` : "Today", value: v }))} note="Illustrative example assuming 3% yearly inflation; not a projection." />
  <section><p>That's where <strong>smart vaults</strong> come in. Instead of your money napping, it connects to the markets where people swap coins all day. Every swap pays a small fee, and part of it goes to those who put their money there. You don't have to watch screens or learn trading: the system does it in the background.</p><p>Let's be clear, though: earnings change every day, aren't guaranteed and there is a risk of loss. That's why it's smart to start small.</p></section>
  <section><h2>The golden rule</h2><p>You don't need thousands of dollars or to be an expert. Try with what you'd spend on a dinner out, watch the earnings come in and withdraw your dollars whenever you decide.</p><p>At the end of the day, your money should work for you, not the other way around.</p></section>
</>;
