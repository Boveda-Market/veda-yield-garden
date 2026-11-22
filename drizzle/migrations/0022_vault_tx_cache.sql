CREATE TABLE public.vault_tx_cache (
  wallet text NOT NULL,
  signature text NOT NULL,
  decoder smallint NOT NULL,
  records jsonb NOT NULL,
  flow jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wallet, signature)
);
GRANT ALL ON public.vault_tx_cache TO service_role;
ALTER TABLE public.vault_tx_cache ENABLE ROW LEVEL SECURITY;