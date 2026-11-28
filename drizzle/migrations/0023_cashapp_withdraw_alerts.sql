CREATE TABLE public.cashapp_withdraw_alerts (
  shift_id text PRIMARY KEY,
  privy_user_id text NOT NULL,
  signature text NOT NULL,
  btc text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cashapp_withdraw_alerts_pending_idx ON public.cashapp_withdraw_alerts (done, created_at);
GRANT ALL ON public.cashapp_withdraw_alerts TO service_role;
ALTER TABLE public.cashapp_withdraw_alerts ENABLE ROW LEVEL SECURITY;