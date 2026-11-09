CREATE TABLE public.affiliates (
  privy_user_id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'base' CHECK (tier IN ('base','promoter','vip')),
  payout_wallet text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.affiliate_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id text NOT NULL,
  channel text NOT NULL,
  audience text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX affiliate_applications_one_pending ON public.affiliate_applications(privy_user_id) WHERE status = 'pending';
CREATE TABLE public.referrals (
  referred_privy_id text PRIMARY KEY,
  affiliate_privy_id text NOT NULL,
  wallet text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.affiliate_earnings (
  signature text PRIMARY KEY,
  affiliate_privy_id text NOT NULL,
  referred_privy_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('harvest','exit')),
  fee_raw bigint NOT NULL,
  share_bps integer NOT NULL,
  commission_raw bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX affiliate_earnings_affiliate ON public.affiliate_earnings(affiliate_privy_id);
GRANT ALL ON public.affiliates, public.affiliate_applications, public.referrals, public.affiliate_earnings TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;