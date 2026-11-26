/** Static, browser-safe whiteboard scenes; captions carry the explanation, drawings carry no live data. */
export function LiquidityStoryboard({ en }: { en: boolean }) {
  const scenes = en ? [
    { title: "An empty counter", line: "No cash, no exchange.", detail: "Customers want to trade, but the counter has no reserves available.", tag: "No liquidity" },
    { title: "Many people contribute", line: "A shared reserve.", detail: "Providers supply the two assets so others can exchange them.", tag: "Liquidity pool" },
    { title: "The money connects trades", line: "Trades generate fees.", detail: "Traders exchange assets. Providers can earn part of the fees when their liquidity is used.", tag: "Trading fees" },
  ] : [
    { title: "Una caja vacía", line: "Sin dinero, no hay cambio.", detail: "Los clientes quieren cambiar, pero el mostrador no tiene reservas disponibles.", tag: "Sin liquidez" },
    { title: "Muchos aportan", line: "Una reserva compartida.", detail: "Los proveedores aportan los dos activos para que otras personas puedan intercambiarlos.", tag: "Pool de liquidez" },
    { title: "El dinero conecta", line: "Los cambios generan comisiones.", detail: "Los traders intercambian activos. Los proveedores pueden recibir parte de las comisiones cuando se usa su liquidez.", tag: "Comisiones" },
  ];
  return <figure aria-label={en ? "Liquidity explained in three scenes" : "La liquidez en tres escenas"} className="not-prose border-y border-border py-6">
    <figcaption className="mb-5 flex items-center gap-3">
      <span aria-hidden="true" className="h-7 w-1 rounded-full bg-primary" />
      <span className="font-display text-lg font-semibold text-foreground">{en ? "Picture the counter" : "Imagina el mostrador"}</span>
    </figcaption>
    <ol className="grid gap-4 md:grid-cols-3">
      {scenes.map((scene, index) => <li key={scene.title} className="min-w-0 rounded-lg border border-border bg-card px-4 pb-5 pt-4">
        <div className="flex items-start gap-2 text-sm font-semibold leading-5 text-foreground">
          <span className="font-mono text-primary">0{index + 1}</span><span>{scene.title}</span>
        </div>
        <Scene index={index} tag={scene.tag} />
        <p className="mt-2 text-sm font-semibold leading-5 text-foreground">{scene.line}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{scene.detail}</p>
      </li>)}
    </ol>
    <p className="mt-4 text-xs leading-5 text-muted-foreground">{en ? "A simplified analogy: on-chain, there is no cashier. Programmed rules govern trades. Fees are not guaranteed profit, and providers can lose capital." : "Una analogía simplificada: en la blockchain no hay cajero; los intercambios siguen reglas programadas. Cobrar comisiones no garantiza ganancias y los proveedores pueden perder capital."}</p>
  </figure>;
}

function Person({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d="M-9 0 C-11-13 10-14 9 0 C9 12-10 13-9 0 Z M0 12 L-1 37 M-1 19 L-15 29 M0 19 L14 28 M-1 37 L-12 53 M-1 37 L10 52" />
  </g>;
}

function Coins({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d="M-12 0 Q0-8 12 0 Q0 8-12 0 Z M-12 0 L-12 17 Q0 25 12 17 L12 0 M-12 6 Q0 14 12 6 M-12 12 Q0 20 12 12" />
  </g>;
}

function Scene({ index, tag }: { index: number; tag: string }) {
  return <svg viewBox="0 0 240 190" aria-hidden="true" className="mx-auto mt-3 aspect-[24/19] w-full max-w-[280px] text-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Slightly uneven marker strokes keep the three scenes in the same drawn language. */}
    <path d="M14 173 Q122 170 226 174" className="text-muted-foreground/40" />
    {index === 0 ? <>
      <Person x={29} y={112} /><Person x={212} y={112} />
      <path d="M58 155 L60 106 L180 104 L183 156 M53 104 Q120 100 188 103 M64 76 L67 35 Q122 30 174 34 L176 76 Z M65 45 L175 43 M65 55 L175 54" />
      <path d="M107 128 L130 147 M131 128 L108 147" className="text-destructive" />
      <path d="M96 84 Q119 90 143 84" strokeDasharray="3 5" className="text-muted-foreground" />
      <text x="120" y="69" textAnchor="middle" stroke="none" fill="currentColor" fontSize="11" fontWeight="600">{tag}</text>
    </> : index === 1 ? <>
      <Person x={31} y={47} /><Person x={120} y={28} /><Person x={208} y={47} />
      <g className="text-primary">
        <path d="M53 75 Q56 104 85 113 M75 111 L85 113 L81 102 M121 91 L121 110 M115 102 L121 110 L127 102 M188 75 Q181 101 155 112 M158 102 L155 112 L165 111" />
        <Coins x={42} y={76} /><Coins x={134} y={75} /><Coins x={197} y={76} />
      </g>
      <path d="M70 126 Q120 119 173 125 L169 160 Q119 168 72 160 Z M70 126 Q120 139 173 125" />
      <text x="120" y="151" textAnchor="middle" stroke="none" fill="currentColor" fontSize="11" fontWeight="600">{tag}</text>
    </> : <>
      <Person x={26} y={54} /><Person x={214} y={54} />
      <path d="M72 76 Q120 67 168 76 L165 115 Q120 124 75 115 Z M72 76 Q120 89 168 76" />
      <g className="text-primary">
        <path d="M48 61 Q91 27 157 52 M147 43 L157 52 L145 55 M192 111 Q150 144 81 126 M90 135 L81 126 L94 124" />
        <Coins x={92} y={91} /><Coins x={143} y={91} />
        <path d="M120 126 L120 145 M114 139 L120 145 L126 139" />
        <Coins x={120} y={151} />
      </g>
      <text x="120" y="19" textAnchor="middle" stroke="none" fill="currentColor" fontSize="11" fontWeight="600">{tag}</text>
    </>}
  </svg>;
}