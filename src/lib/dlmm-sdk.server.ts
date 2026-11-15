import * as mod from "@meteora-ag/dlmm";

type Sdk = typeof import("@meteora-ag/dlmm");
/** The SDK's CommonJS build replaces module.exports with the DLMM class (named helpers as statics); its ESM build exports a default class. Normalize both. */
export async function loadDlmmSdk() {
  const m = mod as unknown as Sdk & { default?: Sdk["default"] };
  const DLMM = (typeof m.default === "function" ? m.default : (m as unknown as Sdk["default"])) as Sdk["default"];
  const pick = <K extends keyof Sdk>(key: K): Sdk[K] => (m[key] ?? (DLMM as unknown as Sdk)[key]) as Sdk[K];
  return { DLMM, StrategyType: pick("StrategyType"), wrapPosition: pick("wrapPosition"), binIdToBinArrayIndex: pick("binIdToBinArrayIndex"), deriveBinArray: pick("deriveBinArray"), decodeAccount: pick("decodeAccount"), getPriceOfBinByBinId: pick("getPriceOfBinByBinId") };
}
