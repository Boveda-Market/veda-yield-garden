# Bóveda Market

**Live app:** <https://bovedamarket.app> · **Telegram:** <https://t.me/bovedamarket> · **Contact:** [admin@bovedamarket.app](mailto:admin@bovedamarket.app)

Bóveda Market is an open-source web interface that connects a wallet to public liquidity
pools on Solana. It handles the parts people usually do by hand — buying the coin,
choosing a price range, opening the position, rebalancing it when the market moves, and
turning it back into dollars — so the owner only has to approve each step.

The interface never holds funds. A position is a wallet-owned position NFT, and every
money-moving transaction is signed by the user's own wallet.

## What this is

- A front end for public liquidity pools (Meteora DLMM pools on Solana).
- An automation layer: the **Autopilot** watches a position and recenters it when it
  leaves range, sells accrued gains into available dollars when the price drops, and
  re-invests them when the price climbs.
- A reporting layer: portfolio value, harvested interest, per-transaction receipts and
  market context, in Spanish and English, built for phones first.

## What this is not

- Not a DEX, AMM, lending protocol or market maker of its own.
- Not a custodian: Bóveda Market never holds, moves or signs for user funds.
- Not affiliated with, endorsed by, or sponsored by Meteora, Orca, Rockstar Games,
  Coinbase, Trump coin, DacityCoin, or any other token issuer or protocol named in the
  app. Names and artwork are used descriptively only.
- Not a bank, not an investment firm, and not a regulated financial service.

## How it works

1. **Pick a vault.** Each vault maps to one public pool with an exact, verifiable address.
2. **Fund it.** Bring your own coins, or buy dollars in-app through an on-ramp. The app
   quotes the cost before anything is confirmed.
3. **The position is built for you.** The system converts, opens one position per vault
   and keeps it active.
4. **Autopilot maintains it.** Recentering, harvesting and range adjustments happen
   without manual math.
5. **Cash out when you want.** Harvest interest or close the vault back into dollars.
   Every action ends on a receipt that does not disappear on its own.

## Features

- Vault lineup with per-vault themes, live prices, pool metrics and yield estimates.
- Autopilot enrollment with per-vault controls and exclusion of balance you do not want
  committed.
- Multi-select close: pick several open vaults and convert them to dollars in one flow.
- Portfolio view with total deposited, harvested interest and a market chart.
- Transaction receipts, system status page and Telegram alert opt-in.
- Two-tier affiliate program (50% / 10%) credited after a fee-bearing operation confirms.
- Guest browsing of public screens; money actions require a verified session.
- Installable, mobile-first UI with day/night themes.

## Tech stack

| Layer | Used |
| --- | --- |
| Framework | TanStack Start v1 (React 19, Vite 7, SSR/SSG) |
| Language | TypeScript |
| Styling | Tailwind CSS v4, semantic design tokens |
| Auth & wallets | Privy (email, Google, passkeys, Phantom, Jupiter Wallet) |
| Chain access | Solana RPC through a private server-side connection (Helius), Meteora DLMM SDK, Jupiter routing |
| Backend | Lovable Cloud (Postgres + Row Level Security), Drizzle migrations in `drizzle/migrations` |
| Market data | Meteora Data API first, DexScreener as fallback |
| Tests | Vitest |

## Getting started

```bash
bun install
bun run dev      # local dev server
bun run test     # unit tests
bun run build    # production build
```

The browser needs the backend URL and its publishable key (already in `.env`). Private
credentials — the RPC provider key and any fee wallet — are **never** stored in this
repository; they are injected as server-side secrets at deploy time and are read only
inside server functions.

## Repository layout

```
src/routes          file-based routes, one per public address (ES) and en/ twins
src/components      UI, sheets, vault cards
src/lib             pure logic: vaults, quotes, autopilot rules, formatters
src/hooks           data reads
src/i18n            English copy
src/integrations    generated backend clients
drizzle/migrations  schema history
scripts             validation harnesses (devnet)
```

## Security notes

- Private keys and provider credentials are server-only; nothing secret is bundled for
  the browser.
- Private tables are protected by Row Level Security and keyed by the verified auth
  subject, not by a client-supplied identifier.
- Ownership of a position is re-checked against live chain state (mint, owner, amount,
  program) before any action is composed.
- The app returns signable bytes for review; the user's wallet is the only signer. The
  single opt-in exception is the Autopilot range vault, which the user enrolls
  explicitly.
- Every money move is simulated on the server first, and the quote shown before
  confirmation is the one the transaction must match.

## Fees

Fees are displayed in the app before each confirmation and are governed by the terms
page (<https://bovedamarket.app/terminos>). They are not fixed in this file on purpose,
so this document can never contradict what the app actually charges.

## Risk disclaimer

Digital assets are volatile. Providing liquidity can result in partial or total loss of
principal, including through price movement outside a chosen range. Yield and APR
figures shown in the app are **estimates** derived from recent public pool activity, not
guarantees, not annual percentage yield, and not a projection of personal return.
Nothing in this repository or in the app is financial, legal or tax advice.

## License

Released under the [MIT License](LICENSE). You may use, modify and redistribute this
code, including commercially, as long as the copyright and permission notice stay with
it. The software is provided as-is, with no warranty of any kind.
