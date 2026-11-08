import { AccountLayout, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import type { AccountInfo, PublicKey } from "@solana/web3.js";
import type { Buffer } from "buffer";

/** SDK discovery derives the position from its NFT; recheck its live owner account. */
export function ownsPositionNft(owner: PublicKey, nft: PublicKey, account: AccountInfo<Buffer> | null | undefined, mint: AccountInfo<Buffer> | null | undefined) {
  if (!account || !mint || account.lamports <= 0 || mint.lamports <= 0 || !account.owner.equals(TOKEN_2022_PROGRAM_ID) || !mint.owner.equals(TOKEN_2022_PROGRAM_ID) || account.data.length < AccountLayout.span) return false;
  const token = AccountLayout.decode(account.data.subarray(0, AccountLayout.span));
  return token.owner.equals(owner) && token.mint.equals(nft) && token.amount === 1n && token.state === 1;
}