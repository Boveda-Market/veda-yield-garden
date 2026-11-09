CREATE TABLE public.verified_wallets (
  wallet text PRIMARY KEY,
  privy_user_id text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.verified_wallets TO service_role;
ALTER TABLE public.verified_wallets ENABLE ROW LEVEL SECURITY;
CREATE INDEX verified_wallets_user_idx ON public.verified_wallets (privy_user_id);