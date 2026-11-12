CREATE TABLE public.user_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id text NOT NULL,
  wallet text,
  category text NOT NULL DEFAULT 'idea' CHECK (category IN ('idea','error','opinion')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 3 AND 500),
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','reviewed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_suggestions TO service_role;
ALTER TABLE public.user_suggestions ENABLE ROW LEVEL SECURITY;
CREATE INDEX user_suggestions_user_created ON public.user_suggestions (privy_user_id, created_at DESC);