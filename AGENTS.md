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
- All demo financial actions use a shared integer-micro-USDC fee breakdown, deduct fees from gross proceeds and require review; no demo state may be represented as an on-chain transfer.
- Email interest submissions use a public validated insert-only server function, a private RLS-locked Cloud table and explicit versioned consent; never expose leads through the demonstration login.
- Legal content has dedicated public routes and must distinguish current demo capabilities from future wallet integrations; do not invent operator contact details or legal jurisdiction.
- FAQs use shared native details/summary disclosures on the home page and a dedicated public route to remain accessible without a Privy session or third-party accordion hook dependency.
- Privy authentication is loaded lazily behind a client-only boundary; use its verified session for UI access and isolate fictitious balances by Privy user ID, never treating local storage as authentication or granting Cloud data access through it.
