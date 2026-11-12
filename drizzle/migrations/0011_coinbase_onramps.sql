CREATE TABLE public.coinbase_onramps (
  privy_user_id text PRIMARY KEY,
  first_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.coinbase_onramps TO service_role;
ALTER TABLE public.coinbase_onramps ENABLE ROW LEVEL SECURITY;