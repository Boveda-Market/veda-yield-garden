# BÓVEDA

Solana pool interface with independent **Real** and **Prueba** modes.

## Current availability

- Privy handles email, Google, Phantom and Jupiter Wallet access.
- Prueba starts a new user with 1,000 fictitious credits. One credit simulates one USDC and has no monetary value. Local positions are isolated by Privy user ID.
- Real is a read-only catalog with an explicit unavailable state. It does not yet query wallet balances or positions, sign financial transactions or transfer funds or fees. Never fund the app to use this version.
- Pool details use exact-address DexScreener queries. Meteora URLs are copy-only.
- The shared 1% calculation is simulated in Prueba. Mainnet transfers require validated pool operations, conversion quotes, user authorization, fee instructions and chain verification.
- Email interest is stored privately with versioned explicit consent, independently of Privy.

## Real release prerequisites

Configure reliable Solana access and required conversion services. Integrate official Meteora / Privy SDK flows, recover chain-owned positions, validate pool token mints, and verify the full deposit / harvest / exit lifecycle with the specified USDC fee recipient. Never promote locally simulated positions into chain assets. Obtain explicit authorization before testing an operation with actual money. Keep Real unavailable until verification is complete.

Operator legal address, privacy contact and jurisdiction are still required for legal review. Domain authorization and a real wallet approval are required for complete Privy sign-in checks.

## Development

TanStack Start, React, TypeScript and Tailwind CSS. Use `bun install`, `bun run dev` and `bun run test` for local development.
