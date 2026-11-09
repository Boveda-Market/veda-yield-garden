ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS share_bps integer NOT NULL DEFAULT 6000 CHECK (share_bps BETWEEN 0 AND 9000);
CREATE TABLE public.affiliate_upgrade_codes (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z0-9]{4,16}$'),
  share_bps integer NOT NULL CHECK (share_bps BETWEEN 6000 AND 9000),
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  times_used integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.affiliate_upgrade_redemptions (
  code text NOT NULL,
  privy_user_id text NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code, privy_user_id)
);
GRANT ALL ON public.affiliate_upgrade_codes, public.affiliate_upgrade_redemptions TO service_role;
ALTER TABLE public.affiliate_upgrade_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_upgrade_redemptions ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.redeem_affiliate_upgrade(_code text, _privy_user_id text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bps integer;
BEGIN
  UPDATE public.affiliate_upgrade_codes SET times_used = times_used + 1
   WHERE code = _code AND is_active AND times_used < max_uses
     AND NOT EXISTS (SELECT 1 FROM public.affiliate_upgrade_redemptions r WHERE r.code = _code AND r.privy_user_id = _privy_user_id)
  RETURNING share_bps INTO v_bps;
  IF v_bps IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.affiliate_upgrade_redemptions(code, privy_user_id) VALUES (_code, _privy_user_id);
  UPDATE public.affiliates SET share_bps = GREATEST(share_bps, v_bps) WHERE privy_user_id = _privy_user_id;
  RETURN v_bps;
END $$;
REVOKE ALL ON FUNCTION public.redeem_affiliate_upgrade(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_affiliate_upgrade(text, text) TO service_role;