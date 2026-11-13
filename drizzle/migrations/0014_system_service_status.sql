CREATE TABLE public.system_service_status (
  service text PRIMARY KEY,
  first_down_at timestamptz,
  operator_alerted boolean NOT NULL DEFAULT false,
  public_alerted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.system_service_status TO service_role;
ALTER TABLE public.system_service_status ENABLE ROW LEVEL SECURITY;