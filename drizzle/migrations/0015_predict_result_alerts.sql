CREATE TABLE public.predict_result_alerts (
  privy_user_id text NOT NULL,
  position text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('won','lost')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (privy_user_id, position)
);
GRANT ALL ON public.predict_result_alerts TO service_role;
ALTER TABLE public.predict_result_alerts ENABLE ROW LEVEL SECURITY;