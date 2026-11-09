ALTER TABLE public.affiliate_earnings ADD COLUMN level smallint NOT NULL DEFAULT 1 CHECK (level IN (1,2));
ALTER TABLE public.affiliate_earnings DROP CONSTRAINT affiliate_earnings_pkey;
ALTER TABLE public.affiliate_earnings ADD PRIMARY KEY (signature, level);
ALTER TABLE public.affiliates ALTER COLUMN share_bps SET DEFAULT 5000;
UPDATE public.affiliates SET share_bps = 5000 WHERE share_bps = 6000;