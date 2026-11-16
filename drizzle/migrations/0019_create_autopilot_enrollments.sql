CREATE TABLE public.autopilot_enrollments (
  wallet text PRIMARY KEY,
  privy_user_id text NOT NULL,
  wallet_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_attempt_at timestamptz,
  last_rebalance_at timestamptz,
  last_signature text,
  last_result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.autopilot_enrollments TO service_role;
ALTER TABLE public.autopilot_enrollments ENABLE ROW LEVEL SECURITY;
CREATE INDEX autopilot_enrollments_user_idx ON public.autopilot_enrollments (privy_user_id);