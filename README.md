# BÓVEDA

Solana pool interface with independent **Real** and **Prueba** modes.

## Current availability

- Privy handles email, Google, Phantom and Jupiter Wallet access.
- Prueba starts a new user with 1,000 fictitious credits. One credit simulates one USDC and has no monetary value. Local positions are isolated by Privy user ID.
- Real reads live SOL, canonical USDC and wallet-owned Meteora position NFTs through a server-only Helius connection. Failed or incomplete queries stay unavailable rather than becoming zero. Unvalidated Token-2022 amount estimates are omitted. Financial operations remain disabled: it does not sign or transfer funds or fees. Never fund the app to use this version.
- Pool details use exact-address DexScreener queries. Meteora URLs are copy-only.
- The shared 1% calculation is simulated in Prueba. Mainnet transfers require validated pool operations, conversion quotes, user authorization, fee instructions and chain verification.
- Email interest is stored privately with versioned explicit consent, independently of Privy.

## Real release prerequisites

Helius is configured through the private `HELIUS_API_KEY` secret. Read-only mainnet validation confirmed all three pool addresses and their token mints. Never expose this URL or provider exceptions to browsers. The public server function accepts only a wallet address and returns public chain data; it does not establish ownership or grant Cloud access.

Integrate conversion services and official Meteora / Privy transaction flows, then verify the full deposit / harvest / exit lifecycle with the specified USDC fee recipient. SDK reads are implemented; transaction composition, signing, conversions and fee collection are not. A fixed SPL transfer cannot charge 1% of unknown conversion proceeds dynamically: validate a staged reviewed workflow or an audited atomic wrapper before claiming exact fee collection. SPCX uses Token-2022 and needs extension-aware validation. Never promote locally simulated positions into chain assets. Obtain explicit wallet authorization before testing an operation with actual money. Keep Real unavailable until verification is complete.

Operator legal address, privacy contact and jurisdiction are still required for legal review. Domain authorization and a real wallet approval are required for complete Privy sign-in checks.

## Development

## Devnet validation

Run `bun scripts/validate-devnet.ts` locally. The isolated harness checks devnet genesis, requires devnet SOL, creates six-decimal test mints and two Meteora pools, then composes a direct Meteora swap, a new-position deposit and the 1% test-USDC transfer into one v0 message. Two pools avoid quoting a deposit against a pool changed by the preceding swap. Jupiter is mainnet-only; this test does not validate Jupiter routing or the three production pools. Private test-wallet files live only under `/tmp`, never in the repository.

The first execution stopped before mint/pool creation because both devnet faucets failed and the test wallet had no SOL. Composition unit tests do not prove chain execution. Devnet simulation, confirmation, final balance/position assertions and a forced-failure rollback test must all pass before considering this flow validated. Mainnet remains disabled.

TanStack Start, React, TypeScript and Tailwind CSS. Use `bun install`, `bun run dev` and `bun run test` for local development.
