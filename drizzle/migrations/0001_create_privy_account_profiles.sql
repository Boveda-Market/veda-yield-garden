CREATE TABLE public.account_profiles (
  privy_user_id text PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  avatar text NOT NULL DEFAULT 'leaf',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_privy_id CHECK (privy_user_id LIKE 'did:privy:%'),
  CONSTRAINT profile_name_length CHECK (char_length(display_name) <= 60),
  CONSTRAINT profile_avatar CHECK (avatar IN ('leaf', 'sun', 'gem', 'waves'))
);
GRANT ALL ON TABLE public.account_profiles TO service_role;
REVOKE ALL ON TABLE public.account_profiles FROM anon, authenticated;
ALTER TABLE public.account_profiles ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.account_profiles IS 'Private optional personalization for externally authenticated Privy users. Access only after server-side Privy JWT verification; no client Data API policies.';