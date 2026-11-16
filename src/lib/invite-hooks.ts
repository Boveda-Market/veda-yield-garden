import { tieredFee } from "./fees";
import { AFFILIATE_SHARE_BPS, affiliateCommission } from "./affiliate";

export type InviteHook = "yield" | "gta6" | "duel";
/** Share messages per hook; gta6 links land on the GTA6 home variant (?v=5). */
export const HOOK_TEXT: Record<InviteHook, string> = {
  yield: "Chequea esto, aquí es donde estoy poniendo a rendir mis dólares. Échale un ojo:",
  gta6: "Mira esta bóveda de GTA6, está pagando un rendimiento brutal en dólares. Échale un ojo:",
  duel: "Chequea Doble o Nada: rondas de 5 minutos, ¿sube o baja? Pruébalo aquí:",
};
export function hookLink(link: string, hook: InviteHook) { return hook === "gta6" && link ? `${link}&v=5` : link; }
/** What the inviter earns (micro-USDC) when a guest exits a vault with `usd` dollars: tiered exit fee × affiliate share. */
export function exampleEarning(usd: number) { return affiliateCommission(tieredFee(BigInt(Math.round(usd * 1e6)), "exit"), AFFILIATE_SHARE_BPS); }
