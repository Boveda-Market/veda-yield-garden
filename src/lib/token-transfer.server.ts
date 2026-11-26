import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { AccountLayout, ExtensionType, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAccount, getMint, getExtensionTypes, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction } from "@solana/spl-token";
import { heliusConnection } from "@/lib/helius.server";
import { computeLimit, smallTxBudgetIxs } from "@/lib/compute-budget";
import { type TransferToken, SOL_RESERVE_LAMPORTS } from "@/lib/wallet-actions";

export async function prepareCheckedTokenTransfer(key: string, input: { from: string; to: string; amount: string }, asset: TransferToken) {
  const connection = heliusConnection(key);
  const owner = new PublicKey(input.from), destination = new PublicKey(input.to), mintKey = new PublicKey(asset.mint);
  const program = asset.token2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const mint = await getMint(connection, mintKey, "confirmed", program);
  if (mint.decimals !== asset.decimals || !mint.isInitialized) throw new Error("mint mismatch");
  if (asset.token2022 && (mint.freezeAuthority || getExtensionTypes(mint.tlvData).some((x) => x !== ExtensionType.MetadataPointer && x !== ExtensionType.TokenMetadata))) throw new Error("unsafe extensions");
  const source = getAssociatedTokenAddressSync(mintKey, owner, false, program);
  const target = getAssociatedTokenAddressSync(mintKey, destination, false, program);
  const [sourceAccount, targetInfo, nativeBefore, lifetime] = await Promise.all([
    getAccount(connection, source, "confirmed", program), connection.getAccountInfo(target, "confirmed"),
    connection.getBalance(owner, "confirmed"), connection.getLatestBlockhash("confirmed"),
  ]);
  const amount = BigInt(input.amount);
  if (amount > 18_446_744_073_709_551_615n || sourceAccount.isFrozen || !sourceAccount.owner.equals(owner) || !sourceAccount.mint.equals(mintKey) || sourceAccount.amount < amount) throw new Error("source mismatch");
  let targetBefore = 0n;
  if (targetInfo) {
    const targetAccount = await getAccount(connection, target, "confirmed", program);
    if (targetAccount.isFrozen || !targetAccount.owner.equals(destination) || !targetAccount.mint.equals(mintKey)) throw new Error("destination mismatch");
    targetBefore = targetAccount.amount;
  }
  const instructions = [
    createAssociatedTokenAccountIdempotentInstruction(owner, target, destination, mintKey, program),
    createTransferCheckedInstruction(source, mintKey, target, owner, amount, asset.decimals, [], program),
  ];
  const makeTx = (units: number) => new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: lifetime.blockhash, instructions: [...smallTxBudgetIxs(units), ...instructions] }).compileToV0Message());
  const sizing = await connection.simulateTransaction(makeTx(100_000), { sigVerify: false, replaceRecentBlockhash: true });
  if (sizing.value.err) throw new Error("simulation failed");
  const transaction = makeTx(computeLimit(sizing.value.unitsConsumed));
  const simulation = await connection.simulateTransaction(transaction, { sigVerify: false, replaceRecentBlockhash: true, accounts: { encoding: "base64", addresses: [source.toBase58(), target.toBase58(), owner.toBase58()] } });
  if (simulation.value.err) throw new Error("simulation failed");
  const [afterSource, afterTarget, afterOwner] = simulation.value.accounts ?? [];
  if (!afterSource || !afterTarget || !afterOwner || afterSource.owner !== program.toBase58() || afterTarget.owner !== program.toBase58()) throw new Error("missing readback");
  const read = (data: string) => AccountLayout.decode(Buffer.from(data, "base64"));
  const sourceData = afterSource.data[0], targetData = afterTarget.data[0];
  if (!sourceData || !targetData) throw new Error("missing account data");
  const afterA = read(sourceData), afterB = read(targetData);
  if (!afterA.mint.equals(mintKey) || !afterB.mint.equals(mintKey) || !afterA.owner.equals(owner) || !afterB.owner.equals(destination) || afterA.amount !== sourceAccount.amount - amount || afterB.amount !== targetBefore + amount) throw new Error("balance mismatch");
  if (afterOwner.lamports > nativeBefore || BigInt(afterOwner.lamports) < SOL_RESERVE_LAMPORTS) throw new Error("reserve insufficient");
  const bytes = transaction.serialize();
  if (bytes.length > 1232) throw new Error("transaction too large");
  return bytes;
}