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
- Real yield displays use a shared browser-side Meteora Data API query validated by exact pool address; annualize reported 24h fees / current TVL × 365 × 100 as estimated simple APR, never APY, personal net yield or trial rates, (no verified compounding/LP allocation). DexScreener supplies price, volume and liquidity; reuse its cache.
- All demo financial actions use a shared integer-micro-USDC fee breakdown, deduct fees from gross proceeds and require review; no demo state may be represented as an on-chain transfer.
- Email interest submissions share the same signup form on public pages and Tu Cuenta, using a public validated insert-only server function, a private RLS-locked Cloud table and explicit versioned consent; never expose leads through the demonstration login or treat the submitted email as a verified login identity.
- Legal content has dedicated public routes and must distinguish current Real availability from fictitious Prueba capabilities; do not invent operator contact details or legal jurisdiction.
- FAQs use shared native details/summary disclosures on the home page and a dedicated public route to remain accessible without a Privy session or third-party accordion hook dependency.
- Privy is lazy and client-only; account UI trusts its session, never local storage. Guest /prueba has isolated fictitious storage and no Real view or signer.
- Security uses the session bridge and Privy dialogs, not local flags; MFA protects embedded-wallet actions only.
- Email login uses EmailLoginSheet inside the single Privy session bridge and official sendCode/loginWithCode hooks; only Privy-authenticated state completes access, while account linking and MFA keep secure Privy dialogs.

- Real and Prueba mount separately; trial guards require trial mode plus verified Privy identity or explicit guest access. Guest credits never migrate into accounts or chain assets.
- Private account profiles are keyed by Privy subject; verify ES256 JWT issuer, audience and expiry with Privy JWKS before owner-scoped admin access. Icon avatars never grant permissions.
- Entry / offers login and guest trial; shared account views expose portfolio, optional profile and bounded recent Solana signatures, never claiming complete token history.
- Portfolio modules load only on demand; SVG graphs use capped observed balances. Real metrics decode finalized official Meteora event-CPI records through bounded private Helius pagination, owner/exact-pool filtered, deduplicated in integer units; show gross per-token flows and coverage; Real PNL means harvested fees (USDC plus harvested tokens at current DexScreener price), never total return without complete basis/valuation. Trial PNL compares balance to initial credits.
- Mainnet deposits use a shared validated amount range for SOL/MET; fee harvest and liquidation support SDK-discovered wallet-owned positions in exact validated SOL/MET pools, never arbitrary pools or unvalidated Token-2022 assets. Fresh server simulation and connected-owner signatures are required. Harvest charges integer 1% of claimed USDC atomically, keeps liquidity untouched and leaves the other token unconverted; locked liquidity and unvalidated rewards block full liquidation and are disclosed.
- Helius reads run only inside server functions with a private credential and sanitized failures; expose narrowly validated public-chain queries, never arbitrary RPC forwarding or Cloud data access.
- Real position discovery uses the official Meteora SDK and wallet-owned position NFTs filtered by exact pools and mints; integer token amounts stay distinct from USD, and unvalidated Token-2022 estimates remain unavailable.
- Devnet transaction validation stays in a local-only harness, verifies genesis before signing or sending, and uses fresh test mints/pools; compose swap and deposit in one message with no entry fee and reject oversized messages.
- Alias Anchor to its explicit CommonJS entry before SSR chunking and in Nitro, with ANCHOR_BROWSER defined true to omit Node-only branches; its browser/ESM entries embed unwrapped CommonJS. Preserve Nitro browser conditions for Solana exports and fully bundle dependencies.
- Map WalletConnect's events import to the browser events package via a client-only pre resolveId plugin; per-environment resolve.alias left an empty stub in production.
- Mainnet deposit simulations use validated fixed pools and private Helius; atomically compose entry fee (ATA only if absent), Jupiter and Meteora; verify exact fee delta, USDC budget and position. Only the pilot returns the verified message partially signed by the ephemeral NFT key; the server never signs as or sends for users. Token-2022 remains unavailable until extension accounting is validated.
- Compact atomic deposits only by deduplicating identical idempotent ATA setup or omitting creation of an existing validated fee ATA; preserve transfers, swaps, deposits, signer privileges and the 1232-byte limit.
- Real liquidation fee is integer 1% of the enforced USDC minimum (Meteora min + Jupiter output floor, nonshared routes, zero extra slippage); snapshot before withdraw, delta-only swaps. Return signable bytes only after SDK-verified owner/position and all simulated balances, fee and NFT rent verify; never sign or broadcast server-side (sole exception: opt-in range-vault Autopilot, see src/lib/AGENTS.md).

- Real dialogs expose deposit authorization and harvest/exit quote review, not standalone diagnostic simulations; retain fresh server simulations, reviewed fee/minimum caps and on-chain ownership/asset gates because previous confirmation cannot validate a new transaction.
- Revalidate SDK-discovered position NFT accounts with shared live mint/owner/amount/program checks before composing harvest or liquidation; only the wallet signs and post-confirmation refresh includes portfolio history.
- Credit affiliates automatically after confirmation, server-side, from the fee-wallet USDC delta paid by a wallet the referred account proved by fresh signed message (one wallet, one account); unique signatures, manual payouts.
- Compute limit = simulated units +25%, low fixed priority (compute-budget.ts).

- Lazy-loaded components use lazyWithReload (src/lib/lazy-reload.ts) and the root listens for vite:preloadError: stale chunks after a new build trigger one guarded reload instead of a blank screen.
- src/lib/dom-guard.ts patches Node removeChild/insertBefore on the client (installed in router.tsx) so translator/extension/visual-editor DOM edits cannot crash React into a blank screen; keep it.
- Operation feedback: transient confirmations use notify() pills (src/lib/notify.tsx, Toaster mounted once in __root); confirmed vault/swap operations end on the shared ActionSuccess receipt, which never auto-dismisses, so users always see a calm, consistent proof of what happened.
- Money actions: quote ready on open → one confirm → move-steps.tsx progress (later approvals chain automatically) → ActionSuccess receipt in dollars, all in one sheet, to avoid extra taps.
- Wallet actions (add funds, withdraw, swap, send, receive) open in the shared ActionSheetContent (src/components/ui/action-sheet.tsx) inside a Dialog root: bottom sheet with swipe-to-close on phones, centered card on desktop, so actions never jump the page scroll.
- Resolve browser theme preferences through src/lib/theme.ts for both pre-paint initialization and the selector, so defaults and storage-failure behavior stay consistent.
- DLMM SDK: dev SSR loads its CommonJS file through a `\0dlmm-cjs` createRequire wrapper (vite.config.ts, serve-only); builds must bundle its ESM entry (never alias it to CJS: the Worker bundle kept bare require("bn.js") and every vault operation crashed). bigint-buffer is aliased to its pure-JS browser build because its Node entry poisons Error.prepareStackTrace in the Worker. Verify server-side Solana changes in a production build under wrangler, since dev runs on Node.
- All ["real-solana", wallet] reads go through useRealWallet (src/hooks/use-real-wallet.ts), which keeps the last complete read when a newer one fails or is incomplete, so totals never drop to cash-only.

- Deposit return intents are timestamped browser-only drafts kept for at most 30 minutes, not prices or authorization; restore through the normal live quote and clear on timeout, explicit cancellation or success. Close waiting quotes on timeout but never interrupt signing, submitted operations or receipts.
- About uses a shared browser-safe page component with public Spanish/English leaf routes, localized metadata and sitemap entries, so it remains accessible without sign-in.
- Range-rebalance earnings allocation is shared pure logic in dlmm.ts with integer tests; final simulation enforces the reserved cash floor, and result destination metadata survives delayed confirmation so receipts never mislabel available earnings as reinvested.
- Compound-interest home variants reuse Landing; their browser-safe educational model stays separate from live yield/account queries and includes uninvested earnings in the simple total, so hypothetical growth cannot be mistaken for a vault quote.
- Public onboarding shares WelcomeFold and ES/EN explanation/access pages; keep campaign URLs and the existing EntryAccess authentication engine so the three-step funnel changes presentation, not authorization.
- Protocol-history blog articles reuse PostLayout/postHead with bilingual leaf routes and cite primary sources; educational diagrams must not imply live pool data.
- Blog whiteboard analogies use browser-safe SVG scenes with localized captions and theme tokens in blog-storyboard.tsx, keeping illustrations light and readable without video downloads.
