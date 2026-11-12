export type AnnouncementKind = "vault" | "market" | "policy" | "update";
export type Announcement = { id: string; date: string; kind: AnnouncementKind; title: string; body: string; href?: "/wallet" | "/terminos" | "/faq" | "/invita" | "/"; cta?: string };

/** Newest first. Add a new entry at the top to publish an update to every user. */
export const ANNOUNCEMENTS: Announcement[] = [
  { id: "2026-11-telegram-alerts", date: "2026-11-12", kind: "update", title: "Alertas personales en Telegram", body: "Conecta BÓVEDA Alertas (@bovedamarketbot) desde Tu cuenta y recibe avisos privados de cosechas, Sube/Baja, retiros y comisiones.", href: "/wallet", cta: "Ir a Mi wallet" },
  { id: "2026-11-coinbase", date: "2026-11-12", kind: "update", title: "Añade y retira fondos con Coinbase", body: "Ahora puedes añadir fondos y retirar a tu banco con Coinbase directamente desde Mi wallet.", href: "/wallet", cta: "Ir a Mi wallet" },
  { id: "2026-11-fees", date: "2026-11-01", kind: "policy", title: "Comisión simple del 1%", body: "Depósitos, cosechas, cierres y retiros tienen 1%. Cambios, envíos y entradas a Sube/Baja son gratis.", href: "/terminos", cta: "Ver términos" },
];

export const latestAnnouncementId = () => ANNOUNCEMENTS[0]?.id ?? "";
export const SEEN_KEY = "boveda.news.seen";
