-- profiles.banned: חסימת גישה לאתר (אדמין יכול לחסום משתמש)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.profiles.banned IS 'חסימת גישה – כשמופעל, המשתמש לא יכול להשתמש באתר (נבדק אחרי התחברות)';

-- challenge_templates: יהלומים לפרס + סימון אתגר שבועי
ALTER TABLE public.challenge_templates
  ADD COLUMN IF NOT EXISTS reward_diamonds integer NOT NULL DEFAULT 3;
ALTER TABLE public.challenge_templates
  ADD COLUMN IF NOT EXISTS is_weekly boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.challenge_templates.reward_diamonds IS 'כמות יהלומים שהשחקן מקבל כשמשלים את האתגר';
COMMENT ON COLUMN public.challenge_templates.is_weekly IS 'אתגר שבועי (true) או יומי (false)';
