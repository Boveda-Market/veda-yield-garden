ALTER TABLE public.affiliate_earnings DROP CONSTRAINT IF EXISTS affiliate_earnings_kind_check;
ALTER TABLE public.affiliate_earnings ADD CONSTRAINT affiliate_earnings_kind_check CHECK (kind = ANY (ARRAY['harvest'::text, 'exit'::text, 'deposit'::text, 'withdraw'::text, 'predict'::text]));
