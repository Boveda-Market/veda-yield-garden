/** First deposit for a wallet with no dollars: suggested $50, and the person buys the deposit plus the one-time activation. */
export const FIRST_DEPOSIT_DEFAULT = "50";
export const FIRST_DEPOSIT_PRESETS = ["20", "50", "100", "250"] as const;
export const firstDepositTotal = (depositMicro: bigint, feeMicro: bigint) => depositMicro + (feeMicro > 0n ? feeMicro : 0n);
