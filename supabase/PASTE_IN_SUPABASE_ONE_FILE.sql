-- ============================================================
-- קובץ אחד להדבקה ב-Supabase
-- Supabase → SQL Editor → New query → הדבק את כל הקובץ → Run
-- בטוח להרצה חוזרת (IF NOT EXISTS / IF EXISTS).
-- אם יש שגיאה על challenge_templates – פשוט מחק או הערה את סעיף 4.
-- ============================================================

-- 1) profiles – יהלומים
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diamonds integer NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.profiles.diamonds IS 'יהלומים – מסונכרן עם הלקוח, מאפס באדמין, תורם מקבל 2000';

-- 2) profiles – חסימת גישה (אדמין)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.profiles.banned IS 'חסימת גישה – כשמופעל, המשתמש לא יכול להשתמש באתר (נבדק אחרי התחברות)';

-- 3) profiles – סיבת חסימה + מי/מתי חסם
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.profiles.banned_reason IS 'סיבת חסימת הגישה (נבחר/נכתב באדמין)';
COMMENT ON COLUMN public.profiles.banned_at IS 'מתי נחסם';
COMMENT ON COLUMN public.profiles.banned_by IS 'אדמין שחסם (user_id)';

-- 4) profiles – דרגת תורם (1/2/3 – משפיע על עיצובים זמינים)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS donor_tier smallint DEFAULT NULL;
COMMENT ON COLUMN public.profiles.donor_tier IS '1=ברונזה, 2=זהב, 3=פלטינום – אדמין מגדיר כשמעניק תורם; משפיע על עיצוב ממשק זמין';

-- 5) challenge_templates – יהלומים לפרס + אתגר שבועי (רק אם הטבלה קיימת)
ALTER TABLE public.challenge_templates
  ADD COLUMN IF NOT EXISTS reward_diamonds integer NOT NULL DEFAULT 3;
ALTER TABLE public.challenge_templates
  ADD COLUMN IF NOT EXISTS is_weekly boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.challenge_templates.reward_diamonds IS 'כמות יהלומים שהשחקן מקבל כשמשלים את האתגר';
COMMENT ON COLUMN public.challenge_templates.is_weekly IS 'אתגר שבועי (true) או יומי (false)';

-- 6) לוג חסימות/ביטול חסימה (אדמין)
CREATE TABLE IF NOT EXISTS public.block_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('block', 'unblock')),
  reason text,
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_block_logs_target_user_id ON public.block_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_block_logs_created_at ON public.block_logs(created_at DESC);
ALTER TABLE public.block_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_logs_admin_only" ON public.block_logs;
CREATE POLICY "block_logs_admin_only" ON public.block_logs
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
