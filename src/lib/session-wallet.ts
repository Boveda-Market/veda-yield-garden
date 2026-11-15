// Picks the wallet address shown right after sign-in. The signer list (useWallets) can stay
// empty for seconds while the protected-wallet frame boots, but the account already knows its
// own protected wallet address; using it lets balances load at once. Signing still waits for the signer.
type LinkedAccount = { type: string; address?: string; chainType?: string; walletClientType?: string };

export function sessionWalletAddress(signers: readonly { address: string }[], authenticated: boolean, linked: readonly LinkedAccount[] | undefined): string | null {
  if (signers[0]?.address) return signers[0].address;
  if (!authenticated) return null;
  const own = linked?.find((a) => a.type === "wallet" && a.chainType === "solana" && (a.walletClientType === "privy" || a.walletClientType === "privy-v2") && typeof a.address === "string");
  return own?.address ?? null;
}
