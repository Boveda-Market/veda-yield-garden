export type LinkedWallet = { type: string; address?: string; chain_type?: string; wallet_client_type?: string; connector_type?: string };

/** Pure decision shared by tests: null means the wallet may trade. */
export function tradeBlockReason(wallet: string, treasury: string, linked: LinkedWallet[]): "treasury" | "external" | "not_owner" | null {
  if (wallet === treasury) return "treasury";
  const own = linked.find((a) => a.type === "wallet" && a.address === wallet);
  if (!own) return "not_owner";
  const embedded = own.chain_type === "solana" && (own.wallet_client_type === "privy" || own.wallet_client_type === "privy-v2" || own.connector_type === "embedded");
  return embedded ? null : "external";
}

/** Pure read decision shared by tests: a wallet's balances and history are only read for its owner (linked to the account or proved by signature) or the operator. */
export function walletReadAllowed(wallet: string, linked: LinkedWallet[], verifiedByCaller: string[], operator: string): boolean {
  if (linked.some((a) => a.type === "wallet" && a.address === wallet)) return true;
  return verifiedByCaller.includes(wallet) || verifiedByCaller.includes(operator);
}
