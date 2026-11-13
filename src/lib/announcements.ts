export type AnnouncementKind = "vault" | "market" | "policy" | "update";
export type Announcement = { id: string; date: string; kind: AnnouncementKind; title: string; body: string; href?: "/wallet" | "/terminos" | "/faq" | "/invita" | "/"; cta?: string };

/** Newest first. Add a new entry at the top to publish an update to every user. */
export const ANNOUNCEMENTS: Announcement[] = [
  { id: "2026-11-fair-fees-redesign", date: "2026-11-13", kind: "policy", title: "$0 por depositar y una app más limpia", body: "Depositar en cualquier bóveda ahora cuesta $0: solo pagas un pequeño porcentaje al cosechar o retirar. Niveles Básico, Plus, Pro y VIP: más capital, menor tarifa; en la cosecha cuenta tu capital total. Mover a mayor APR es gratis y el cambio voluntario cuesta 0.10%. Bóvedas ahora es un catálogo limpio, Portafolio resume tu rendimiento y Sube o Baja tiene un tablero en vivo más ágil.", href: "/terminos", cta: "Ver términos" },
  { id: "2026-11-fee-tiers", date: "2026-11-13", kind: "policy", title: "Nuevas comisiones por niveles: más mueves, menos pagas", body: "Más mueves, menos pagas. Depositar, enviar, cambiar monedas y entrar a Sube/Baja es gratis. Siempre ves la comisión antes de firmar. El detalle completo está en Términos y condiciones.", href: "/terminos", cta: "Ver términos" },
  { id: "2026-11-funding-upgrades", date: "2026-11-12", kind: "update", title: "Añadir y retirar fondos, más fácil", body: "Retiros a tu saldo de Coinbase al instante, con firma automática al volver a BÓVEDA. Compra con tarjeta o Apple Pay guiada en dólares (sugerido $100, mínimo $50) y activación de dólares estable desde $0.50.", href: "/wallet", cta: "Ir a Mi Billetera" },
  { id: "2026-11-vault-move", date: "2026-11-12", kind: "vault", title: "Traslado a bóvedas con mayor APR", body: "Si otra bóveda rinde al menos 5% más, muévete en 2 pasos o usa «Cosechar y reinvertir todo» para sumar tus ganancias al capital.", href: "/", cta: "Ir a Bóvedas" },
  { id: "2026-11-telegram-alerts", date: "2026-11-12", kind: "update", title: "Alertas personales en Telegram", body: "Conecta BÓVEDA Alertas (@bovedamarketbot) desde Tu cuenta y recibe avisos privados de cosechas, Sube/Baja, retiros y comisiones.", href: "/wallet", cta: "Ir a Mi Billetera" },
  { id: "2026-11-coinbase", date: "2026-11-12", kind: "update", title: "Añade y retira fondos con Coinbase", body: "Ahora puedes añadir fondos y retirar a tu banco con Coinbase directamente desde Mi Billetera.", href: "/wallet", cta: "Ir a Mi Billetera" },
  { id: "2026-11-fees", date: "2026-11-01", kind: "policy", title: "Comisiones por niveles: más mueves, menos pagas", body: "Cuanto mayor es el monto, menor el porcentaje. Siempre ves la comisión antes de firmar.", href: "/terminos", cta: "Ver términos" },
];

export const latestAnnouncementId = () => ANNOUNCEMENTS[0]?.id ?? "";
export const SEEN_KEY = "boveda.news.seen";
export const DISMISSED_KEY = "boveda.news.dismissed";
