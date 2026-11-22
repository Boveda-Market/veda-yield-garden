/** Live deposit quote (integer micro-USDC): the first deposit pays the activation fee and the network reserve from the same dollars. */
export function depositQuote(amountMicro: bigint, chargeMicro: bigint | null, feeMicro: bigint) {
  const charge = chargeMicro ?? 0n;
  const fee = chargeMicro == null ? 0n : (feeMicro < charge ? feeMicro : charge);
  const reserve = charge - fee;
  const net = amountMicro > charge ? amountMicro - charge : 0n;
  return { amount: amountMicro, fee, reserve, net };
}
/** Quick amounts offered when the account has no dollars yet, so anyone can get a quote. */
export const QUOTE_PRESETS = ["20", "50", "100", "500"] as const;
/** Doble o Nada entry: the stake stays whole and the one-time activation is paid on top, so the total needed is stake + charge. */
export function playQuote(stakeMicro: bigint, chargeMicro: bigint | null, feeMicro: bigint) {
  const charge = chargeMicro ?? 0n;
  const fee = chargeMicro == null ? 0n : (feeMicro < charge ? feeMicro : charge);
  return { stake: stakeMicro, fee, reserve: charge - fee, total: stakeMicro + charge };
}
