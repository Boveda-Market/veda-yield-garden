CREATE TABLE public.app_presence (
  id text PRIMARY KEY,
  privy_user_id text,
  screen text NOT NULL DEFAULT '',
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_presence TO service_role;
ALTER TABLE public.app_presence ENABLE ROW LEVEL SECURITY;
CREATE INDEX app_presence_last_seen_idx ON public.app_presence (last_seen DESC);
CREATE INDEX app_presence_privy_idx ON public.app_presence (privy_user_id) WHERE privy_user_id IS NOT NULL;