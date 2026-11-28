/** Shared Telegram HTML helpers (pure, browser-safe) so every post and alert follows one clean, scannable layout. */
export const tgEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const TG_RULE = "━━━━━━━━━━━━━━";
export const TG_SAFETY = "<i>🛡️ Bóveda Market nunca te pedirá claves ni frases secretas.</i>";

/** Alert card: emoji + bold title, a thin divider, then short lines (falsy lines are skipped). Lines are trusted HTML. */
export function tgCard(icon: string, title: string, lines: Array<string | false | null | undefined>): string {
  return `${icon} <b>${title}</b>\n${TG_RULE}\n${lines.filter(Boolean).join("\n")}`;
}
/** One "label: value" row with the value in bold. */
export const tgRow = (icon: string, label: string, value: string) => `${icon} ${label}: <b>${value}</b>`;
/** Closing line for alerts about something already in progress or finished. */
export const NO_ACTION_LINE = "✨ <b>No tienes que hacer ninguna acción.</b>";
