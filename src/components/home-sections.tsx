import { useT } from "@/lib/i18n";

type Card = { icon: string; title: string; body: string };
type Flow = { compareTitle: string; compareSub: string; compare: readonly [Card, Card, Card]; howTitle: string; how: readonly (readonly [string, string])[] };

const CALM: Flow = {
  compareTitle: "¿Cansado de mirar gráficas todo el día?",
  compareSub: "Hay otra forma de tener cripto: que la volatilidad trabaje para ti mientras duermes.",
  compare: [
    { icon: "😰", title: "Comprar y holdear", body: "Solo ganas si el precio sube. Si baja, toca esperar con ansiedad." },
    { icon: "📉", title: "Trading manual", body: "Comprar y vender a mano exige tiempo, nervios y acertar cada movimiento." },
    { icon: "🏦", title: "Bóveda", body: "Cobras una parte de cada compra y venta, suba o baje, y el Piloto Automático la cuida." },
  ],
  howTitle: "¿De dónde salen los intereses?",
  how: [
    ["Alguien compra o vende", "Pasa miles de veces al día, suba o baje el precio."],
    ["Paga una comisión pequeña", "Como el cobro de una casa de cambio."],
    ["La comisión se reparte", "Va a las personas con dinero en la bóveda, como tú."],
  ],
};

const FLOWS: Record<string, Flow> = {
  trump: {
    compareTitle: "¿Compraste Trump Coin y solo esperaste?",
    compareSub: "Hay otra forma de estar en Trump Coin: cobrar por el movimiento del mercado.",
    compare: [
      { icon: "🙏", title: "Comprar y esperar", body: "Solo ganas si el precio sube. Si baja, solo te queda esperar." },
      { icon: "🎢", title: "Trading manual", body: "Adivinar subidas y bajadas a mano cansa y suele salir caro." },
      { icon: "🇺🇸", title: "Bóveda Trump Coin", body: "Cobra comisiones en dólares del volumen que se mueve las 24 horas." },
    ],
    howTitle: "¿De dónde salen los intereses?",
    how: [
      ["Mucha gente compra y vende Trump Coin", "Es uno de los mercados más activos del día."],
      ["Cada operación paga una comisión", "Pequeña, como en una casa de cambio."],
      ["Tu bóveda cobra su parte", "Muchas operaciones pequeñas suman intereses continuos."],
    ],
  },
  gta6: {
    compareTitle: "¿Apostar al hype o ser la casa?",
    compareSub: "En el casino siempre gana la casa. Con la bóveda, la casa eres tú.",
    compare: [
      { icon: "🎲", title: "Especular con memes", body: "Puedes subir mucho y caer igual de rápido. Es pura suerte." },
      { icon: "⏳", title: "Esperar al lanzamiento", body: "Compras y aguantas meses sin saber qué pasará con el precio." },
      { icon: "🎰", title: "Bóveda GTA6", body: "Sé la casa: cobras una parte de cada compra y venta de GTA6 Coin." },
    ],
    howTitle: "¿De dónde salen los intereses?",
    how: [
      ["El hype mueve el mercado", "La comunidad compra y vende GTA6 Coin todo el día."],
      ["Cada movimiento paga comisión", "Aunque el precio suba o baje."],
      ["La casa cobra", "Las comisiones llegan a quienes tienen dinero en la bóveda."],
    ],
  },
  doble: {
    compareTitle: "Rápido, claro y en dólares",
    compareSub: "Sin préstamos, sin letra pequeña y sin comprar monedas.",
    compare: [
      { icon: "💣", title: "Futuros con préstamo", body: "Un mal movimiento y te liquidan todo. Reglas difíciles de entender." },
      { icon: "🕳️", title: "Plataformas opacas", body: "No sabes cómo se decide quién gana ni cuándo te pagan." },
      { icon: "⚡", title: "Doble o Nada", body: "Rondas de 5 minutos, reglas fijas y premios automáticos en dólares." },
    ],
    howTitle: "¿Cómo funciona una ronda?",
    how: [
      ["Eliges Sube o Baja", "Bitcoin, Ethereum o Solana, con los dólares que quieras."],
      ["Corre el reloj", "La ronda se resuelve sola con un precio público."],
      ["Cobras si aciertas", "El premio queda en tu billetera listo para usar."],
    ],
  },
};

/** Bitcoin-style comparison + "how it works" blocks for every other home version. */
export function ThemeSections({ theme }: { theme?: string | undefined }) {
  const t = useT();
  const f = FLOWS[theme ?? ""] ?? CALM;
  return <>
    <section aria-label={t(f.compareTitle)} className="mb-4 py-8">
      <h2 className="font-display text-2xl font-bold">{t(f.compareTitle)}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t(f.compareSub)}</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">{f.compare.map((c, i) => <li key={c.title} className={`rounded-2xl border p-4 ${i === 2 ? "border-primary bg-primary/5" : "border-border bg-card"}`}><p className="text-2xl" aria-hidden>{c.icon}</p><h3 className="mt-2 font-display font-bold">{t(c.title)}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(c.body)}</p></li>)}</ul>
    </section>
    <section aria-label={t(f.howTitle)} className="mb-4 py-8">
      <h2 className="font-display text-2xl font-bold">{t(f.howTitle)}</h2>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">{f.how.map(([h, d], i) => <li key={h} className="rounded-2xl border border-border bg-card p-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">{i + 1}</span><h3 className="mt-3 font-display font-bold">{t(h)}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(d)}</p></li>)}</ol>
    </section>
  </>;
}
