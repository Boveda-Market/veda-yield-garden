/** Editorial photo covers (AI-generated, illustrative only: no live data) that open each post by picturing its problem. */
import atmCover from "@/assets/blog/blog-cover-atm.jpg.asset.json";
import exchangeCover from "@/assets/blog/blog-cover-exchange.jpg.asset.json";
import fearCover from "@/assets/blog/blog-cover-fear.jpg.asset.json";
import keysCover from "@/assets/blog/blog-cover-keys.jpg.asset.json";
import phoneCover from "@/assets/blog/blog-cover-phone.jpg.asset.json";
import poolCover from "@/assets/blog/blog-cover-pool.jpg.asset.json";
import privacyCover from "@/assets/blog/blog-cover-privacy.jpg.asset.json";
import swingsCover from "@/assets/blog/blog-cover-swings.jpg.asset.json";

type Scene = "privacy" | "fear" | "exchange" | "pool" | "phone" | "keys" | "swings" | "atm";

export const HERO_BY_PATH: Record<string, Scene> = {
  "/blog/bitcoin-atms-forma-cara-riesgosa": "atm",
  "/blog/deepfakes-nvidia-swings-masivos": "swings",
  "/blog/hackeo-binance-llaves": "keys",
  "/blog/privacidad-bitcoin-35-centavos": "privacy",
  "/blog/miedo-caida-bitcoin-holdear": "fear",
  "/blog/meteora-historia-y-como-funciona": "exchange",
  "/blog/liquidez-concentrada": "pool",
  "/blog/dolares-digitales-en-el-celular": "phone",
};

type Cover = { url: string; altEs: string; altEn: string; capEs: string; capEn: string };

const COVERS: Record<Scene, Cover> = {
  atm: {
    url: atmCover.url,
    altEs: "Hombre usando un Bitcoin ATM en una acera de noche mientras una figura encapuchada lo observa a lo lejos.",
    altEn: "A man using a Bitcoin ATM on a sidewalk at night while a hooded figure watches from a distance.",
    capEs: "Un Bitcoin ATM en la calle, de noche: pagas de más y alguien puede estar mirando.",
    capEn: "A Bitcoin ATM on the street at night: you pay extra and someone may be watching.",
  },
  swings: {
    url: swingsCover.url,
    altEs: "Persona sentada de noche frente a un monitor con una gráfica en desplome y un teléfono que reproduce un video.",
    altEn: "A person sitting at night in front of a monitor showing a crashing chart and a phone playing a video.",
    capEs: "Un video falso sacude el precio arriba y abajo… y quien tiene su bóveda en piloto automático sigue tranquilo.",
    capEn: "A fake video shakes the price up and down… while the person with their vault on autopilot stays calm.",
  },
  keys: {
    url: keysCover.url,
    altEs: "Mano que sostiene una billetera de hardware frente a la puerta abierta de una bóveda bancaria iluminada en rojo.",
    altEn: "A hand holding a hardware wallet in front of an open bank vault door lit in red.",
    capEs: "La caja fuerte compartida se abre a la fuerza… y quien guarda sus propias llaves sigue tranquilo.",
    capEn: "The shared safe is forced open… while the person who keeps their own keys stays calm.",
  },
  privacy: {
    url: privacyCover.url,
    altEs: "Monedas y un teléfono sobre una mesa junto a una maqueta de casa marcada con un pin de ubicación rojo.",
    altEn: "Coins and a phone on a table beside a model house marked with a red location pin.",
    capEs: "Unos centavos llegan a la billetera… y alguien ubica la casa.",
    capEn: "A few cents reach the wallet… and someone locates the house.",
  },
  fear: {
    url: fearCover.url,
    altEs: "Persona preocupada mirando un teléfono con una gráfica en caída y avisos flotantes, junto a una moneda física de Bitcoin.",
    altEn: "A worried person looking at a phone showing a falling chart and floating alerts, next to a physical Bitcoin coin.",
    capEs: "El precio cae, llegan las alertas y el Bitcoin sigue quieto.",
    capEn: "Price falls, alerts pile up and the Bitcoin just sits there.",
  },
  exchange: {
    url: exchangeCover.url,
    altEs: "Cajero de un banco de época entregando monedas por un mostrador de madera a una clienta.",
    altEn: "A teller in an old-fashioned bank handing coins across a wooden counter to a customer.",
    capEs: "Una casa de cambio de siempre: unos traen monedas, otros se las llevan.",
    capEn: "The old exchange counter: some bring coins, others take them.",
  },
  pool: {
    url: poolCover.url,
    altEs: "Varias manos dejan caer monedas dentro de un cuenco de cristal compartido sobre una mesa.",
    altEn: "Several hands drop coins into one shared glass bowl on a table.",
    capEs: "Muchas personas aportan a una reserva compartida.",
    capEn: "Many people add to a shared reserve.",
  },
  phone: {
    url: phoneCover.url,
    altEs: "Mano que sostiene un teléfono en una cafetería mientras hilos de luz con monedas entran a la pantalla.",
    altEn: "A hand holding a phone in a cafe while streams of light and coins flow into the screen.",
    capEs: "Dólares digitales que llegan directo al celular.",
    capEn: "Digital dollars arriving straight to the phone.",
  },
};

/** Cover for a post path, or null when the post has none. */
export function heroCover(path: string): Cover | null {
  const scene = HERO_BY_PATH[path];
  return scene ? COVERS[scene] : null;
}

export function BlogHero({ path, en }: { path: string; en: boolean }) {
  const cover = heroCover(path);
  if (!cover) return null;
  return <figure className="not-prose mt-6 overflow-hidden rounded-2xl border border-border bg-card">
    <img
      src={cover.url}
      alt={en ? cover.altEn : cover.altEs}
      width={1672}
      height={941}
      decoding="async"
      className="block h-auto w-full"
    />
    <figcaption className="border-t border-border px-4 py-2 text-xs leading-5 text-muted-foreground">
      {en ? cover.capEn : cover.capEs}
    </figcaption>
  </figure>;
}
