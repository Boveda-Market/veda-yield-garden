import { createFileRoute } from "@tanstack/react-router";
import { PostLayout, postHead } from "@/components/blog-layout";
import { Callout, CompareTable, ProsCons, StatCards } from "@/components/blog-visuals";

const P = "/blog/privacidad-bitcoin-35-centavos";
export const Route = createFileRoute("/blog/privacidad-bitcoin-35-centavos")({ staticData: { sitemap: true }, head: () => postHead("es", P), component: Page });

const Y1 = "https://es-us.finanzas.yahoo.com/noticias/descubren-vulnerabilidad-privacidad-billeteras-bitcoin-002000805.html";
const G1 = "https://trends.google.com/trends/explore?q=bitcoin%20wallet%20privacy";

const A = ({ href, children }: { href: string; children: string }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;

export function Page() {
  return <PostLayout path={P} es={ES} enBody={EN} />;
}

const ES = <>
  <p>Durante años nos dijeron que, para guardar Bitcoin de forma segura, había que convertirse en técnico: descargar programas pesados, configurar la red de casa y esconder palabras en papel. Hoy quiero contarte por qué esa receta tiene grietas.</p>
  <p>Soy Sofía Holdd y esta semana una noticia me confirmó algo que llevo tiempo diciendo: holdear a la antigua no solo deja tu dinero quieto, también puede dejarte expuesto.</p>
  <section><h2>Lo que dice Yahoo: tu conexión por menos de 35 centavos</h2><p>Yahoo Finanzas recoge una investigación del desarrollador de Bitcoin Core Abubakar Sadiq Ismail: con un pago de entre 0.18 y 0.34 dólares, un atacante podría descubrir la dirección de internet (IP) de la computadora donde corre una billetera de Bitcoin, y con ella su ubicación aproximada (<A href={Y1}>Yahoo Finanzas</A>).</p><p>El truco aprovecha que el programa reenvía automáticamente los pagos pendientes a la red: el atacante envía unos centavos y observa qué computadora vuelve a anunciarlos. Según la nota, también podría afectar a configuraciones de billeteras populares como Sparrow, Bitcoin Knots, Specter Desktop y Liana, e incluso a algunos usuarios de Tor.</p><p>Para ser justos: el experimento aún no se ha replicado en la red real, y una IP por sí sola no prueba quién eres. Pero unir tus saldos públicos con la conexión de tu casa facilita la vigilancia, los perfiles financieros y hasta las amenazas físicas.</p></section>
  <StatCards items={[{ value: "$0.18–0.34", label: "costo estimado del ataque, según Yahoo Finanzas" }, { value: "4+", label: "billeteras de escritorio citadas como posibles afectadas" }]} />
  <ProsCons prosTitle="A favor de holdear a la antigua" consTitle="En contra" pros={["Tú controlas tus llaves, nadie más", "No dependes de una empresa para entrar a tu dinero"]} cons={["Tu conexión de casa puede quedar expuesta por centavos", "Programas que mantener y palabras en papel que no tienen vuelta atrás", "Tu Bitcoin se queda quieto, sin generar nada"]} />
  <section><h2>Lo que dice Google: la ansiedad de quien solo quería ahorrar</h2><p>Mientras la prensa técnica alerta, la gente busca. En Google aparecen preguntas como «cómo ocultar la IP de mi billetera» o «¿es segura mi billetera de Bitcoin?» (puedes explorar el interés en <A href={G1}>Google Trends</A>). Es el retrato de alguien que solo quería ahorrar a largo plazo y terminó atrapado entre parches, puertos y alertas.</p></section>
  <section><h2>El doble problema de holdear a la antigua</h2><p><strong>Riesgo técnico:</strong> programas que hay que mantener, ajustes de red y palabras de recuperación en papel que, si se pierden o se filtran, no tienen marcha atrás.</p><p><strong>Dinero congelado:</strong> además de toda esa preocupación, tu Bitcoin no produce nada mientras esperas, suba o baje el precio.</p></section>
  <section><h2>Cómo lo resolvemos en Bóveda</h2><p>En Bóveda Market no descargas ningún programa ni conectas la computadora de tu casa a la red de Bitcoin. Tu billetera está protegida con Privy, un sistema de seguridad que separa y resguarda tus llaves, y cada movimiento lo autorizas tú con Face ID o tu huella. Bóveda nunca custodia tu dinero.</p><p>Y mientras esperas, la Bóveda Bitcoin pone tu depósito, que sigue el precio de Bitcoin 1 a 1, a trabajar en mercados públicos. Las comisiones que genera las cosechas a <strong>dólares digitales</strong> con un toque desde Mi Portafolio.</p><p>Hablemos claro: ningún sistema elimina todo el riesgo, las ganancias cambian cada día y no están garantizadas, y el valor de tu depósito sube y baja con el mercado. Puede haber pérdida.</p></section>
  <CompareTable highlight={1} cols={["Billetera a la antigua", "Bóveda Bitcoin"]} rows={[
    { label: "Tu conexión de casa", cells: ["Puede quedar expuesta por centavos", "No corres programas en tu computadora"] },
    { label: "Acceso diario", cells: ["Programas y palabras en papel", "Face ID o huella; solo tú autorizas"] },
    { label: "Mientras esperas", cells: ["Dinero quieto", "Comisiones variables, no garantizadas"] },
    { label: "Mantenimiento", cells: ["Parches, puertos y alertas", "Listo para usar en el teléfono"] },
  ]} />
  <section><h2>El consejo de Sofía</h2><p>Ahorrar en Bitcoin no debería sentirse como administrar un servidor.</p><Callout>Cuando Yahoo grite y Google se llene de dudas, recuerda: la seguridad que sirve es la que puedes usar todos los días, sin exponer tu casa y sin dejar tu dinero dormido.</Callout></section>
</>;

const EN = <>
  <p>For years we were told that to store Bitcoin safely you had to become a technician: download heavy software, configure your home network and hide words on paper. Today I want to show you why that recipe has cracks.</p>
  <p>I'm Sofía Holdd, and this week a news story confirmed something I've been saying for a while: old-school holding doesn't just leave your money idle, it can leave you exposed.</p>
  <section><h2>What Yahoo says: your connection for under 35 cents</h2><p>Yahoo Finance covers research by Bitcoin Core developer Abubakar Sadiq Ismail: with a payment of $0.18 to $0.34, an attacker could discover the internet address (IP) of the computer running a Bitcoin wallet, and with it its approximate location (<A href={Y1}>Yahoo Finance</A>).</p><p>The trick abuses the software automatically re-sending pending payments to the network: the attacker sends a few cents and watches which computer announces them again. According to the article, it could also affect setups of popular wallets such as Sparrow, Bitcoin Knots, Specter Desktop and Liana, and even some Tor users.</p><p>To be fair: the experiment hasn't been replicated on the live network yet, and an IP alone doesn't prove who you are. But linking your public balances to your home connection makes surveillance, financial profiling and even physical threats easier.</p></section>
  <StatCards items={[{ value: "$0.18–0.34", label: "estimated attack cost, per Yahoo Finance" }, { value: "4+", label: "desktop wallets cited as possibly affected" }]} />
  <ProsCons prosTitle="In favor of old-school holding" consTitle="Against" pros={["You control your keys, nobody else", "No company stands between you and your money"]} cons={["Your home connection can be exposed for cents", "Software to maintain and paper words with no undo", "Your Bitcoin sits idle, earning nothing"]} />
  <section><h2>What Google says: the anxiety of people who just wanted to save</h2><p>While the tech press warns, people search. Google shows questions like “how to hide my wallet IP” or “is my Bitcoin wallet safe?” (you can explore the interest on <A href={G1}>Google Trends</A>). It's the portrait of someone who just wanted to save long term and ended up stuck between patches, ports and alerts.</p></section>
  <section><h2>The double problem of old-school holding</h2><p><strong>Technical risk:</strong> software to maintain, network settings and recovery words on paper that, if lost or leaked, can't be undone.</p><p><strong>Frozen money:</strong> on top of all that worry, your Bitcoin produces nothing while you wait, whether the price rises or falls.</p></section>
  <section><h2>How we solve it at Bóveda</h2><p>At Bóveda Market you don't download any software or connect your home computer to the Bitcoin network. Your wallet is protected by Privy, a security system that splits and safeguards your keys, and you authorize every move with Face ID or your fingerprint. Bóveda never holds your money.</p><p>And while you wait, the Bitcoin Vault puts your deposit, which tracks Bitcoin's price 1 to 1, to work in public markets. You harvest the fees it earns to <strong>digital dollars</strong> with one tap from My Portfolio.</p><p>Let's be clear: no system removes all risk, earnings change daily and aren't guaranteed, and your deposit's value rises and falls with the market. Loss is possible.</p></section>
  <CompareTable highlight={1} cols={["Old-school wallet", "Bitcoin Vault"]} rows={[
    { label: "Your home connection", cells: ["Can be exposed for cents", "No software running on your computer"] },
    { label: "Daily access", cells: ["Software and paper words", "Face ID or fingerprint; only you authorize"] },
    { label: "While you wait", cells: ["Idle money", "Variable fees, not guaranteed"] },
    { label: "Maintenance", cells: ["Patches, ports and alerts", "Ready to use on your phone"] },
  ]} />
  <section><h2>Sofía's advice</h2><p>Saving in Bitcoin shouldn't feel like running a server.</p><Callout>When Yahoo shouts and Google fills with doubts, remember: the security that works is the one you can use every day, without exposing your home or letting your money sleep.</Callout></section>
</>;
