import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, guideHead, type GuideEn } from "@/components/guide-layout";

const P = "/guias/ganar-intereses-bitcoin";
const T = "Cómo ganar intereses con Bitcoin sin ser experto";
const D = "Qué es la Bóveda Bitcoin, de dónde salen sus intereses, cuánto se puede ganar y cómo empezar solo con dólares digitales. Explicado fácil.";
export const Route = createFileRoute("/guias/ganar-intereses-bitcoin")({ staticData: { sitemap: true }, head: () => guideHead({ path: P, title: T, description: D }), component: Page });

export function Page() {
  return <GuideLayout current={P} title={T} en={EN} minutes={4} intro="Mucha gente compra Bitcoin y lo deja quieto esperando que suba. Con la Bóveda Bitcoin tu dinero, además de seguir el precio del Bitcoin, cobra intereses cada vez que otras personas compran o venden.">
    <section><h2>¿De dónde salen los intereses?</h2><p>Cada vez que alguien cambia dólares por Bitcoin (o al revés) en el mercado de la bóveda, paga una pequeña comisión. Esa comisión no se la queda un banco: se reparte entre las personas que tienen dinero depositado, como tú. Mientras más se mueve el mercado, más comisiones se generan.</p></section>
    <section><h2>¿Tengo que comprar Bitcoin primero?</h2><p>No. Solo necesitas dólares digitales en tu cuenta. Al depositar, el sistema compra la parte de Bitcoin por ti y arma la bóveda en un solo toque. Tú confirmas una vez.</p></section>
    <section><h2>¿Cuánto se puede ganar?</h2><p>En los detalles de cada bóveda ves el <strong>interés anual estimado</strong>, calculado con la actividad real de las últimas 24 horas. Es una estimación que cambia todos los días: no es una tasa fija ni está garantizada. Tus ganancias reales las ves en <strong>Mi Portafolio</strong> como intereses cosechados.</p></section>
    <section><h2>Cómo empezar, paso a paso</h2><ol><li>Entra con tu cuenta de Google o tu correo.</li><li>Recarga dólares digitales con tarjeta o Coinbase.</li><li>Ve a <strong>Bóvedas</strong>, toca la <strong>Bóveda Bitcoin</strong> y elige cuánto depositar.</li><li>Confirma una vez. Tu bóveda empieza a generar intereses.</li></ol></section>
    <section><h2>¿Puedo sacar mi dinero cuando quiera?</h2><p>Sí. Puedes cobrar solo tus intereses o retirar el 25%, 50%, 75% o 100% en cualquier momento, sin plazos. Desde la Billetera los envías a tu banco o a tu Cash App como Bitcoin.</p></section>
    <section><h2>Riesgos que debes conocer</h2><ul><li>El valor de tu bóveda sube y baja con el precio del Bitcoin.</li><li>Los intereses son estimados y pueden bajar si hay poca actividad.</li><li>Deposita solo dinero que puedas mantener invertido sin presión.</li></ul></section>
  </GuideLayout>;
}

const EN: GuideEn = { title: "How to earn interest on Bitcoin without being an expert", intro: "Many people buy Bitcoin and just leave it sitting there, hoping it goes up. With the Bitcoin Vault, your money follows the Bitcoin price and also collects interest every time other people buy or sell.", body: <>
    <section><h2>Where does the interest come from?</h2><p>Every time someone swaps dollars for Bitcoin (or the other way around) in the vault's market, they pay a small fee. A bank doesn't keep that fee: it's shared among the people with money deposited, like you. The more the market moves, the more fees are generated.</p></section>
    <section><h2>Do I have to buy Bitcoin first?</h2><p>No. You only need digital dollars in your account. When you deposit, the system buys the Bitcoin part for you and sets up the vault in one tap. You confirm once.</p></section>
    <section><h2>How much can I earn?</h2><p>Each vault's details show the <strong>estimated annual interest</strong>, calculated from real activity over the last 24 hours. It's an estimate that changes every day: it is not a fixed or guaranteed rate. You see your real earnings in <strong>My Portfolio</strong> as harvested interest.</p></section>
    <section><h2>How to start, step by step</h2><ol><li>Sign in with your Google account or email.</li><li>Add digital dollars with a card or Coinbase.</li><li>Go to <strong>Vaults</strong>, tap the <strong>Bitcoin Vault</strong> and choose how much to deposit.</li><li>Confirm once. Your vault starts earning interest.</li></ol></section>
    <section><h2>Can I take my money out anytime?</h2><p>Yes. You can collect just your interest or withdraw 25%, 50%, 75% or 100% at any time, with no lock-up. From the Wallet you send it to your bank or to your Cash App as Bitcoin.</p></section>
    <section><h2>Risks you should know</h2><ul><li>Your vault's value goes up and down with the Bitcoin price.</li><li>Interest is estimated and can drop when there's little activity.</li><li>Only deposit money you can keep invested without pressure.</li></ul></section>
</> };
