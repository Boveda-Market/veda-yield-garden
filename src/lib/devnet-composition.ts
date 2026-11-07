import { ComputeBudgetProgram, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { FEE_WALLET } from "@/lib/fees";

export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const DEVNET_RPC = "https://api.devnet.solana.com";

export function requireDevnet(genesis: string) {
  if (genesis !== DEVNET_GENESIS) throw new Error("Solo se permite devnet; mainnet está bloqueada");
}

export function testDepositAmounts(gross: bigint) {
  if (gross <= 0n || gross > 18_446_744_073_709_551_615n) throw new Error("Importe de prueba inválido");
  const fee = 0n;
  return { gross, fee, net: gross - fee };
}

/** No broadcasting or signing here; caller must enforce devnet and simulate all instructions. */
export function composeDevnetDeposit(input: {
  genesis: string; owner: PublicKey; testUsdcMint: PublicKey; blockhash: string;
  gross: bigint; swap: TransactionInstruction[]; deposit: TransactionInstruction[];
}) {
  requireDevnet(input.genesis);
  const amounts = testDepositAmounts(input.gross);
  const recipient = new PublicKey(FEE_WALLET);
  const recipientAta = getAssociatedTokenAddressSync(input.testUsdcMint, recipient);
  const instructions = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_200_000 }),
    ...input.swap.filter((ix) => !ix.programId.equals(ComputeBudgetProgram.programId)),
    ...input.deposit.filter((ix) => !ix.programId.equals(ComputeBudgetProgram.programId)),
  ];
  const message = new TransactionMessage({ payerKey: input.owner, recentBlockhash: input.blockhash, instructions }).compileToV0Message();
  const transaction = new VersionedTransaction(message);
  if (transaction.serialize().length > 1232) throw new Error("La transacción compuesta supera 1232 bytes; no dividir ni cobrar por separado");
  return { transaction, recipientAta, amounts };
}