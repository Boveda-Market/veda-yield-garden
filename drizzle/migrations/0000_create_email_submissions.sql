CREATE TABLE public.email_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL CHECK (length(email) <= 254),
 consent_version text NOT NULL,
 consented_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_submissions TO service_role;
ALTER TABLE public.email_submissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX email_submissions_email_created_idx ON public.email_submissions(email, created_at DESC);
CREATE FUNCTION public.limit_email_submissions() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.email, 0));
 IF EXISTS (SELECT 1 FROM public.email_submissions WHERE email = NEW.email AND created_at > now() - interval '1 minute') THEN
  RAISE EXCEPTION 'Please wait before submitting again';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.limit_email_submissions() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER limit_email_submissions BEFORE INSERT ON public.email_submissions FOR EACH ROW EXECUTE FUNCTION public.limit_email_submissions();