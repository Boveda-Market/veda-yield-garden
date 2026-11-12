CREATE TABLE public.telegram_links (
  privy_user_id text PRIMARY KEY,
  chat_id bigint,
  username text,
  link_code text UNIQUE,
  code_expires_at timestamptz,
  alerts_enabled boolean NOT NULL DEFAULT true,
  linked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.telegram_links TO service_role;
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;