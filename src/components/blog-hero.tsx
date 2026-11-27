/** Animated cover scenes (pure SVG + SMIL, SSR-safe, no downloads) that open each post by picturing its problem. Illustrative only: no live data. */
type Scene = "privacy" | "fear" | "exchange" | "pool" | "phone" | "keys";

export const HERO_BY_PATH: Record<string, Scene> = {
  "/blog/hackeo-binance-llaves": "keys",
  "/blog/privacidad-bitcoin-35-centavos": "privacy",
  "/blog/miedo-caida-bitcoin-holdear": "fear",
  "/blog/meteora-historia-y-como-funciona": "exchange",
  "/blog/liquidez-concentrada": "pool",
  "/blog/dolares-digitales-en-el-celular": "phone",
};

const CAP: Record<Scene, [string, string]> = {
  privacy: ["Unos centavos llegan a la billetera… y alguien ubica la casa.", "A few cents reach the wallet… and someone locates the house."],
  fear: ["El precio cae, llegan las alertas y el Bitcoin sigue quieto.", "Price falls, alerts pile up and the Bitcoin just sits there."],
  exchange: ["Una casa de cambio: unos traen monedas, otros se las llevan.", "An exchange counter: some bring coins, others take them."],
  pool: ["Muchas personas aportan a una reserva compartida.", "Many people add to a shared reserve."],
  keys: ["Hackean la gran caja fuerte compartida… y quien guarda sus llaves sigue tranquilo.", "The big shared safe gets hacked… while the person who keeps their keys stays calm."],
  phone: ["Dólares digitales que llegan directo al celular.", "Digital dollars arriving straight to the phone."],
};

const Person = ({ x, y, mood = "calm" }: { x: number; y: number; mood?: "calm" | "worried" | "sneaky" }) => <g transform={`translate(${x} ${y})`}>
  <circle r="13" className="fill-card" />
  {mood === "sneaky" ? <path d="M-14-4 H14" strokeWidth="5" /> : <><circle cx="-4" cy="-2" r="1.6" fill="currentColor" stroke="none" /><circle cx="4" cy="-2" r="1.6" fill="currentColor" stroke="none" /></>}
  <path d={mood === "worried" ? "M-5 7 Q0 2 5 7" : "M-5 5 Q0 9 5 5"} />
  <path d="M0 13 V45 M0 22 L-14 34 M0 22 L14 34 M0 45 L-11 64 M0 45 L11 64" />
</g>;

const Coin = ({ x, y, label = "$" }: { x: number; y: number; label?: string }) => <g transform={`translate(${x} ${y})`} className="text-primary">
  <circle r="9" className="fill-primary/15" /><text y="4" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" stroke="none">{label}</text>
</g>;

const Move = ({ path, dur = "3s", children }: { path: string; dur?: string; children: React.ReactNode }) => <g>
  {children}<animateMotion dur={dur} repeatCount="indefinite" path={path} />
</g>;

const Pulse = ({ children, dur = "1.6s" }: { children: React.ReactNode; dur?: string }) => <g>
  {children}<animate attributeName="opacity" values="1;0.25;1" dur={dur} repeatCount="indefinite" />
</g>;

function Art({ scene }: { scene: Scene }) {
  switch (scene) {
    case "keys": return <>
      <path d="M30 200 V80 L95 50 L160 80 V200 Z" /><path d="M50 200 V110 M75 200 V110 M115 200 V110 M140 200 V110" className="text-muted-foreground" />
      <Pulse dur="1.1s"><g className="text-destructive"><rect x="80" y="120" width="30" height="24" rx="4" className="fill-destructive/15" /><path d="M86 120 V112 Q95 100 104 108" /><path d="M60 40 L68 52 M130 40 L122 52" /></g></Pulse>
      <Move path="M70 -10 C60 -30 40 -20 0 0" dur="2.8s"><Coin x={110} y={170} /></Move>
      <Person x={200} y={130} mood="sneaky" />
      <Person x={300} y={130} />
      <g className="text-primary"><rect x="318" y="150" width="20" height="32" rx="4" /><Pulse dur="2.2s"><path d="M328 92 L346 99 V112 Q346 124 328 131 Q310 124 310 112 V99 Z" className="fill-primary/15" /></Pulse><circle cx="328" cy="110" r="4" /><path d="M328 114 V120" /></g>
    </>;
    case "privacy": return <>
      <path d="M40 150 L80 115 L120 150 V200 H40 Z" /><rect x="70" y="170" width="20" height="30" />
      <Pulse><g className="text-destructive"><path d="M80 70 C66 70 60 82 66 92 L80 110 L94 92 C100 82 94 70 80 70 Z" className="fill-destructive/15" /><circle cx="80" cy="86" r="5" /></g></Pulse>
      <Person x={165} y={130} /><rect x="185" y="165" width="34" height="22" rx="3" /><path d="M180 190 H226" />
      <Move path="M150 0 C120 -30 60 -20 0 0" dur="3.5s"><Coin x={250} y={150} label="¢" /></Move>
      <Person x={300} y={120} mood="sneaky" />
      <g transform="translate(330 120)"><circle r="12" /><path d="M8 9 L20 22" strokeWidth="4" /><animateTransform attributeName="transform" type="translate" values="330 120;318 112;330 120" dur="2s" repeatCount="indefinite" /></g>
    </>;
    case "fear": return <>
      <rect x="40" y="40" width="160" height="110" rx="8" /><g className="text-destructive"><path d="M55 60 L90 80 L115 70 L150 115 L185 135" strokeWidth="4" strokeDasharray="200" strokeDashoffset="200"><animate attributeName="stroke-dashoffset" values="200;0;0" dur="3s" repeatCount="indefinite" /></path><path d="M175 125 L185 135 L172 138" /></g>
      <Person x={260} y={120} mood="worried" />
      <Pulse dur="1.2s"><g className="text-destructive"><rect x="285" y="40" width="70" height="26" rx="13" className="fill-destructive/10" /><text x="320" y="58" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" stroke="none">→ $0?</text></g></Pulse>
      <Pulse dur="1.9s"><g className="text-destructive"><rect x="300" y="78" width="46" height="22" rx="11" className="fill-destructive/10" /><text x="323" y="93" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" stroke="none">-12%</text></g></Pulse>
      <g className="text-muted-foreground"><rect x="215" y="180" width="30" height="20" rx="3" /><Coin x={230} y={170} label="₿" /><text x="230" y="215" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">zzz</text></g>
    </>;
    case "exchange": return <>
      <path d="M120 150 H260 V200 H120 Z M110 150 H270" /><text x="190" y="180" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor" stroke="none">⇄</text>
      <Person x={60} y={130} /><Person x={320} y={130} />
      <Move path="M0 0 L180 0" dur="3s"><Coin x={85} y={130} label="₿" /></Move>
      <Move path="M0 0 L-180 0" dur="3s"><Coin x={295} y={110} /></Move>
    </>;
    case "pool": return <>
      <path d="M110 160 Q190 145 270 160 L262 205 Q190 218 118 205 Z" className="fill-primary/10" /><path d="M110 160 Q190 178 270 160" />
      <Person x={60} y={90} /><Person x={190} y={30} /><Person x={320} y={90} />
      <Move path="M0 0 L60 60" dur="2.6s"><Coin x={85} y={120} /></Move>
      <Move path="M0 0 L0 80" dur="2.2s"><Coin x={190} y={95} label="₿" /></Move>
      <Move path="M0 0 L-60 60" dur="3s"><Coin x={295} y={120} /></Move>
    </>;
    case "phone": return <>
      <Person x={130} y={120} /><rect x="160" y="125" width="34" height="58" rx="6" /><path d="M170 175 H184" />
      <Move path="M0 0 C-40 30 -90 60 -130 90" dur="2.8s"><Coin x={310} y={60} /></Move>
      <Move path="M0 0 C-30 40 -80 70 -110 100" dur="3.4s"><Coin x={290} y={40} /></Move>
      <Pulse><text x="177" y="158" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" stroke="none" className="text-primary">$</text></Pulse>
    </>;
  }
}

export function BlogHero({ path, en }: { path: string; en: boolean }) {
  const scene = HERO_BY_PATH[path];
  if (!scene) return null;
  const cap = CAP[scene][en ? 1 : 0];
  return <figure className="not-prose mt-6 overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/10 via-card to-secondary/40">
    <svg viewBox="0 0 380 230" role="img" aria-label={cap} className="block h-auto w-full text-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 215 Q190 210 370 216" className="text-muted-foreground/40" />
      <Art scene={scene} />
    </svg>
    <figcaption className="border-t border-border px-4 py-2 text-xs leading-5 text-muted-foreground">{cap}</figcaption>
  </figure>;
}
