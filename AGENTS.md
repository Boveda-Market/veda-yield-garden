<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Pool details live in a shared dialog backed by browser-side public DexScreener queries; validate exact Solana pool addresses, distinguish USD metrics from token amounts, and leave missing statistics unavailable to avoid misleading financial data.
- Real yield displays use a shared browser-side Meteora Data API query validated by exact pool address; annualize reported 24h fees / current TVL × 365 × 100 as estimated simple APR, never APY, personal net yield or trial rates, because no compounding or individual LP allocation is verified. DexScreener remains the source of price, volume and liquidity statistics; reuse its query cache in cards and details.
- All demo financial actions use a shared integer-micro-USDC fee breakdown, deduct fees from gross proceeds and require review; no demo state may be represented as an on-chain transfer.
- Email interest submissions share the same signup form on public pages and Tu Cuenta, using a public validated insert-only server function, a private RLS-locked Cloud table and explicit versioned consent; never expose leads through the demonstration login or treat the submitted email as a verified login identity.
- Legal content has dedicated public routes and must distinguish current Real availability from fictitious Prueba capabilities; do not invent operator contact details or legal jurisdiction.
- FAQs use shared native details/summary disclosures on the home page and a dedicated public route to remain accessible without a Privy session or third-party accordion hook dependency.
- Privy is lazy and client-only; account UI trusts its session, never local storage. Guest /prueba has isolated fictitious storage and no Real view or signer.

- Real and Prueba mount separately; trial guards require trial mode plus verified Privy identity or explicit guest access. Guest credits never migrate into accounts or chain assets.
- Private account profiles are keyed by Privy subject; verify ES256 JWT issuer, audience and expiry with Privy JWKS before owner-scoped admin access. Icon avatars never grant permissions.
- Entry / offers login and guest trial; shared account views expose portfolio, optional profile and bounded recent Solana signatures, never claiming complete token history.
- Portfolio modules load only on demand; SVG graphs use capped observed balances. Real metrics decode finalized official Meteora event-CPI records through bounded private Helius pagination, owner/exact-pool filtered, deduplicated in integer units; show gross per-token flows and coverage; Real PNL means harvested fees (USDC plus harvested tokens at current DexScreener price), never total return without complete basis/valuation. Trial PNL compares balance to initial credits.
- Mainnet deposits use a shared validated amount range for SOL/MET; fee harvest and liquidation stay limited to the exact owner-authorized SOL pilot position. Fresh server simulation and connected-owner signatures are required. Harvest charges integer 1% of claimed USDC atomically, keeps liquidity untouched and leaves the other token unconverted; new position exits remain unavailable and are disclosed before deposit consent.
- Helius reads run only inside server functions with a private credential and sanitized failures; expose narrowly validated public-chain queries, never arbitrary RPC forwarding or Cloud data access.
- Real position discovery uses the official Meteora SDK and wallet-owned position NFTs filtered by exact pools and mints; integer token amounts stay distinct from USD, and unvalidated Token-2022 estimates remain unavailable.
- Devnet transaction validation stays in a local-only harness, verifies genesis before signing or sending, and uses fresh test mints/pools; compose swap and deposit in one message with no entry fee and reject oversized messages.
- Alias Anchor to its explicit CommonJS entry before SSR chunking and in Nitro, with ANCHOR_BROWSER defined true to omit Node-only branches; its browser/ESM entries embed unwrapped CommonJS. Preserve Nitro browser conditions for Solana exports and fully bundle dependencies.
- Resolve WalletConnect's events import to the browser-compatible events package in the client environment so Vite cannot replace its EventEmitter with an empty Node stub.
- Mainnet deposit simulations use validated fixed pools and private Helius; compose Jupiter and Meteora atomically with no fee transfer or recipient ATA setup, then verify the owner's USDC budget and position. Only the pilot returns the verified message partially signed by the ephemeral NFT key; the server never signs as or sends for users. Token-2022 remains unavailable until extension accounting is validated.
- Compact atomic deposits only by deduplicating identical idempotent ATA setup or omitting creation of an existing validated fee ATA; preserve transfers, swaps, deposits, signer privileges and the 1232-byte limit.
- Pilot liquidation fees use integer 1% of the enforced Meteora USDC minimum plus Jupiter output minimum; ledger snapshots precede withdrawal, delta-only swaps preserve old balances, and decoded nonshared Jupiter routes enforce that exact output floor with zero further slippage. Return signable bytes only for the exact authorized owner/position after all simulated balances, fee and NFT rent verify; review caps reject worse quotes. Meteora alone closes its Token-2022 NFT lifecycle. Never sign or broadcast server-side.

- Real dialogs expose deposit authorization and harvest/exit quote review, not standalone diagnostic simulations; retain fresh server simulations, reviewed fee/minimum caps and exact pilot exit gates because previous confirmation cannot validate a new transaction.
