import { createFileRoute } from "@tanstack/react-router";
import { PostLayout, postHead } from "@/components/blog-layout";
import { CompareTable, StatCards } from "@/components/blog-visuals";

const P = "/blog/bitcoin-atms-forma-cara-riesgosa";
export const Route = createFileRoute("/blog/bitcoin-atms-forma-cara-riesgosa")({ staticData: { sitemap: true }, head: () => postHead("es", P), component: Page });

const FTC = "https://search.ftc.gov/system/files/ftc_gov/pdf/bitcoin_atms_spotlight.pdf";
const CNN = "https://www.cnn.com/interactive/2025/10/us/crypto-atm-scams-companies-profit-invs-vis/";
const YF = "https://es-us.finanzas.yahoo.com/search?p=bitcoin+atm";
const G1 = "https://trends.google.com/trends/explore?q=bitcoin%20atm";
const GN = "https://www.google.com/search?q=bitcoin+atm&tbm=nws";

const A = ({ href, children }: { href: string; children: string }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;

export function Page() {
  return <PostLayout path={P} es={ES} enBody={EN} />;
}

const ES = <>
  <p>Seguro los has visto: una máquina brillante en la gasolinera, en la tienda de la esquina o en el supermercado, con un letrero de «Compra Bitcoin aquí». Metes billetes, escaneas un código y listo. Parece fácil. El problema es todo lo que no dice el letrero.</p>
  <p>Soy Sofía Holdd y hoy quiero hablarte de los Bitcoin ATM's: lo bueno, lo malo y por qué hoy puedes holdear Bitcoin por tu cuenta sin salir de casa.</p>
  <section><h2>Lo que dicen las noticias y Google</h2><p>Si buscas «bitcoin atm» en <A href={YF}>Yahoo Finanzas</A> o en <A href={GN}>Google Noticias</A>, la conversación casi siempre gira en torno a lo mismo: comisiones y estafas. Y en <A href={G1}>Google Trends</A> puedes ver cuánta gente busca estas máquinas, muchas veces sin saber cuánto cuestan de verdad.</p><p>Los datos oficiales son claros. La Comisión Federal de Comercio de EE. UU. (FTC) informó que las pérdidas por fraude en Bitcoin ATM's se multiplicaron casi por diez entre 2020 y 2023 y superaron los 65 millones de dólares solo en la primera mitad de 2024, con una pérdida típica (mediana) de 10,000 dólares por persona (<A href={FTC}>FTC</A>). Una investigación de CNN encontró que las empresas de estas máquinas suelen cobrar un sobreprecio de 20% a 30% o más sobre el precio del Bitcoin (<A href={CNN}>CNN</A>).</p></section>
  <StatCards items={[{ value: "20–30%", label: "sobreprecio habitual en Bitcoin ATM's, según CNN" }, { value: "+$65M", label: "perdidos por fraude en la primera mitad de 2024, según la FTC" }, { value: "$10,000", label: "pérdida típica (mediana) reportada por víctima, según la FTC" }, { value: "3×", label: "más probable que una persona mayor de 60 reporte pérdidas, según la FTC" }]} />
  <section><h2>Los pros (que sí existen)</h2><p><strong>Efectivo al instante:</strong> si solo tienes billetes y no usas banco, la máquina convierte tu efectivo en Bitcoin en minutos.</p><p><strong>Sin registrarte en una app:</strong> para montos pequeños, algunas máquinas piden pocos datos. Ojo: cada vez más exigen tu identificación y tu teléfono.</p></section>
  <section><h2>Los contras que no te cuentan</h2><p><strong>Empiezas perdiendo:</strong> con un sobreprecio de 20%, si metes 1,000 dólares recibes Bitcoin por unos 800. El precio tiene que subir bastante solo para que recuperes lo que pagaste.</p><p><strong>Riesgo en la calle:</strong> ir a una gasolinera con un fajo de billetes, de noche o a la vista de todos, te expone a robos.</p><p><strong>El cajero favorito de los estafadores:</strong> según la FTC, la mayoría de las pérdidas vienen de llamadas falsas de «tu banco», «el gobierno» o «soporte técnico» que te urgen a sacar efectivo y depositarlo en la máquina escaneando un código que ellos te mandan. Una vez enviado, no hay forma de deshacerlo.</p><p><strong>Y después, ¿qué?:</strong> el Bitcoin que compraste queda quieto en una billetera, sin generar nada mientras esperas.</p></section>
  <section><h2>La alternativa: tu Bitcoin desde el celular</h2><p>En Bóveda Market abres tu billetera en un minuto con Google, desde tu sillón. No tienes que ir a ningún lugar, cargar efectivo ni dictarle un código a nadie. Tus llaves están protegidas con Privy y cada movimiento lo autorizas tú con Face ID o tu huella; Bóveda nunca recibe ni custodia tu dinero.</p><p>Y en vez de dejar tu Bitcoin quieto, en la Bóveda Bitcoin el Piloto Automático lo mantiene en rango y puede generar intereses en dólares digitales.</p><p>Hablemos claro: ningún sistema elimina todo el riesgo. Las bóvedas pueden perder valor, pueden quedar fuera de rango y las ganancias no están garantizadas.</p></section>
  <CompareTable highlight={1} cols={["Bitcoin ATM", "Bóveda en tu celular"]} rows={[
    { label: "Sobreprecio", cells: ["20% a 30% o más (CNN)", "Sin sobreprecio de máquina"] },
    { label: "Dónde lo haces", cells: ["En la calle, con efectivo", "Desde casa, en tu celular"] },
    { label: "Si te presionan por teléfono", cells: ["El dinero se va y no vuelve", "Nadie puede moverlo sin tu firma"] },
    { label: "Qué hace tu Bitcoin después", cells: ["Se queda quieto", "Puede generar intereses"] },
  ]} />
  <section><h2>El consejo de Sofía</h2><p>Ningún banco, gobierno ni empresa te va a pedir que deposites efectivo en un Bitcoin ATM. Si alguien te lo pide con urgencia, cuelga. Y si quieres holdear Bitcoin, hazlo con calma, desde tu casa y con tus propias llaves.</p></section>
</>;

const EN = <>
  <p>You've surely seen them: a shiny machine at the gas station, the corner store or the supermarket, with a "Buy Bitcoin here" sign. Insert cash, scan a code and done. It looks easy. The problem is everything the sign doesn't say.</p>
  <p>I'm Sofía Holdd and today I want to talk about Bitcoin ATM's: the good, the bad and why you can now hold Bitcoin on your own without leaving home.</p>
  <section><h2>What the news and Google say</h2><p>Search "bitcoin atm" on <A href={YF}>Yahoo Finance</A> or <A href={GN}>Google News</A> and the conversation almost always comes back to the same thing: fees and scams. On <A href={G1}>Google Trends</A> you can see how many people search for these machines, often without knowing what they really cost.</p><p>The official data is clear. The US Federal Trade Commission (FTC) reported that fraud losses at Bitcoin ATM's grew nearly tenfold from 2020 to 2023 and topped 65 million dollars in just the first half of 2024, with a typical (median) loss of 10,000 dollars per person (<A href={FTC}>FTC</A>). A CNN investigation found that these machine operators often mark up the Bitcoin price by 20% to 30% or more (<A href={CNN}>CNN</A>).</p></section>
  <StatCards items={[{ value: "20–30%", label: "usual markup at Bitcoin ATM's, per CNN" }, { value: "+$65M", label: "lost to fraud in the first half of 2024, per the FTC" }, { value: "$10,000", label: "typical (median) loss reported per victim, per the FTC" }, { value: "3×", label: "more likely for people over 60 to report losses, per the FTC" }]} />
  <section><h2>The pros (they do exist)</h2><p><strong>Instant cash:</strong> if you only have bills and don't use a bank, the machine turns your cash into Bitcoin in minutes.</p><p><strong>No app sign-up:</strong> for small amounts, some machines ask for little data. Careful: more and more require your ID and phone.</p></section>
  <section><h2>The cons nobody tells you</h2><p><strong>You start at a loss:</strong> with a 20% markup, putting in 1,000 dollars gets you about 800 worth of Bitcoin. The price has to rise a lot just to get back what you paid.</p><p><strong>Street risk:</strong> going to a gas station with a wad of cash, at night or in plain sight, exposes you to robbery.</p><p><strong>Scammers' favorite cashier:</strong> according to the FTC, most losses come from fake calls from "your bank", "the government" or "tech support" urging you to withdraw cash and deposit it in the machine by scanning a code they send you. Once sent, there's no undoing it.</p><p><strong>And then what?:</strong> the Bitcoin you bought just sits in a wallet, earning nothing while you wait.</p></section>
  <section><h2>The alternative: your Bitcoin from your phone</h2><p>At Bóveda Market you open your wallet in a minute with Google, from your couch. You don't go anywhere, carry cash or read a code to anyone. Your keys are protected by Privy and you authorize every move with Face ID or your fingerprint; Bóveda never receives or holds your money.</p><p>And instead of leaving your Bitcoin idle, in the Bitcoin Vault the Autopilot keeps it in range and it can earn interest in digital dollars.</p><p>Let's be clear: no system removes all risk. Vaults can lose value, can go out of range and earnings aren't guaranteed.</p></section>
  <CompareTable highlight={1} cols={["Bitcoin ATM", "Vault on your phone"]} rows={[
    { label: "Markup", cells: ["20% to 30% or more (CNN)", "No machine markup"] },
    { label: "Where you do it", cells: ["On the street, with cash", "From home, on your phone"] },
    { label: "If someone pressures you by phone", cells: ["The money leaves and never returns", "Nobody can move it without your signature"] },
    { label: "What your Bitcoin does next", cells: ["Sits idle", "Can earn interest"] },
  ]} />
  <section><h2>Sofía's advice</h2><p>No bank, government or company will ever ask you to deposit cash into a Bitcoin ATM. If someone urgently asks you to, hang up. And if you want to hold Bitcoin, do it calmly, from home and with your own keys.</p></section>
</>;
