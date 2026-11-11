ALTER TABLE public.affiliate_earnings ADD COLUMN IF NOT EXISTS payout_signature text;
ALTER TABLE public.affiliate_earnings ADD COLUMN IF NOT EXISTS paid_at timestamptz;
CREATE INDEX IF NOT EXISTS affiliate_earnings_payout_sig_idx ON public.affiliate_earnings (payout_signature);