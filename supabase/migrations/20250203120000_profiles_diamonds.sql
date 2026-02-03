-- Add diamonds to profiles (for sync with client, admin reset, and donor reward)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diamonds integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.diamonds IS 'יהלומים – מסונכרן עם הלקוח, מאפס באדמין, תורם מקבל 2000';
