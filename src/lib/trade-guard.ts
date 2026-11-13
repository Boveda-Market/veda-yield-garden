export type LinkedWallet = { type: string; address?: string; chain_type?: string; wallet_client_type?: string; connector_type?: string };

/** Pure decision shared by tests: null means the wallet may trade. */
export function tradeBlockReason(wallet: string, treasury: string, linked: LinkedWallet[]): "treasury" | "external" | "not_owner" | null {
  if (wallet === treasury) return "treasury";
  const own = linked.find((a) => a.type === "wallet" && a.address === wallet);
  if (!own) return "not_owner";
  const embedded = own.chain_type === "solana" && (own.wallet_client_type === "privy" || own.wallet_client_type === "privy-v2" || own.connector_type === "embedded");
  return embedded ? null : "external";
}
