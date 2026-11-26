import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { BovedaSession } from "@/hooks/use-boveda-session";

export type PluginTransaction = { serialize: () => Uint8Array };
export type PluginWallet = ReturnType<typeof createPluginWallet>;
export type PluginSuccess = { txid: string };
export type JupiterPlugin = {
  init: (props: {
    displayMode: "integrated";
    integratedTargetId: string;
    enableWalletPassthrough: true;
    passthroughWalletContextState: PluginWallet;
    onRequestConnectWallet: () => void;
    formProps: { initialInputMint: string; initialOutputMint: string; initialAmount?: string };
    containerStyles: { width: string; height: string; borderRadius: string; overflow: string };
    containerClassName: string;
    onSuccess: (result: PluginSuccess) => void;
    onScreenUpdate: (screen: string) => void;
    onFormUpdate: (form: { fromValue: string }) => void;
  }) => void | Promise<void>;
  syncProps: (props: { passthroughWalletContextState: PluginWallet }) => void;
  close: () => void;
  root?: { unmount: () => void } | null;
};

export function getJupiterPlugin(): JupiterPlugin | undefined {
  return (window as Window & { Jupiter?: JupiterPlugin }).Jupiter;
}

let pending: Promise<JupiterPlugin> | undefined;
/** Only load the official script when the swap sheet opens; failures can be retried. */
export function loadJupiterPlugin(): Promise<JupiterPlugin> {
  const ready = getJupiterPlugin();
  if (ready) return Promise.resolve(ready);
  if (pending) return pending;
  pending = new Promise<JupiterPlugin>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://plugin.jup.ag/plugin-v1.js";
    script.async = true;
    const timeout = setTimeout(() => fail(), 20_000);
    const fail = () => { clearTimeout(timeout); script.remove(); pending = undefined; reject(new Error("Jupiter no está disponible. Inténtalo de nuevo.")); };
    script.onerror = fail;
    script.onload = () => { clearTimeout(timeout); const plugin = getJupiterPlugin(); if (plugin) resolve(plugin); else fail(); };
    document.head.appendChild(script);
  });
  return pending;
}

/** Jupiter is the venue/executor; the existing verified session remains the only signer. */
export function createPluginWallet(getSession: () => BovedaSession) {
  const session = getSession();
  const publicKey = session.authenticated && session.walletAddress ? new PublicKey(session.walletAddress) : null;
  const connect = async () => { getSession().login("google"); };
  const disconnect = async () => { /* Disconnecting a venue never logs out the Bóveda account. */ };
  const signTransaction = async <T extends PluginTransaction>(transaction: T): Promise<T> => {
    const current = getSession();
    if (!current.authenticated || !current.walletAddress || !current.signOnly || current.tradeBlock) throw new Error("Esta billetera no puede realizar operaciones.");
    if (current.walletAddress !== publicKey?.toBase58()) throw new Error("Tu cuenta cambió. Vuelve a abrir el cambio.");
    const bytes = new Uint8Array(transaction.serialize());
    if (bytes.length > 1232) throw new Error("La operación es demasiado grande.");
    const decoded = VersionedTransaction.deserialize(bytes);
    const signers = decoded.message.staticAccountKeys.slice(0, decoded.message.header.numRequiredSignatures);
    if (!signers.some((key) => key.toBase58() === current.walletAddress)) throw new Error("La operación no corresponde a tu billetera.");
    const signed = await current.signOnly(bytes);
    if (getSession().walletAddress !== current.walletAddress || !getSession().authenticated) throw new Error("Tu cuenta cambió. Vuelve a abrir el cambio.");
    const verified = VersionedTransaction.deserialize(signed);
    if (Array.from(verified.message.serialize()).join(",") !== Array.from(decoded.message.serialize()).join(",")) throw new Error("La operación cambió durante la firma.");
    // Preserve Jupiter's transaction class (its bundled web3 instance may differ).
    const result = transaction as T & { signatures?: Uint8Array[] };
    result.signatures = verified.signatures;
    return result;
  };
  const sendTransaction = async (): Promise<string> => { throw new Error("Jupiter envía únicamente el cambio que confirmaste."); };
  const adapter = { name: "Bóveda Market", publicKey, connected: Boolean(publicKey), connecting: false, connect, disconnect, signTransaction, sendTransaction,
    icon: "/icon-192.png", url: "https://bovedamarket.app", supportedTransactionVersions: new Set([0, "legacy"]) };
  return { publicKey, wallet: { adapter, readyState: "Installed" }, wallets: [], connected: Boolean(publicKey), connecting: false,
    disconnecting: false, autoConnect: false, connect, disconnect, select: () => {}, signTransaction, sendTransaction };
}