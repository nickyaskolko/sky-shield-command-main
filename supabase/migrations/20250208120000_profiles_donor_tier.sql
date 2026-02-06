-- דרגת תורם: 1=ברונזה, 2=זהב, 3=פלטינום (משפיע על עיצובים זמינים)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS donor_tier smallint DEFAULT NULL;

COMMENT ON COLUMN public.profiles.donor_tier IS '1=ברונזה, 2=זהב, 3=פלטינום – אדמין מגדיר כשמעניק תורם; משפיע על עיצוב ממשק זמין';
