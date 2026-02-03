-- Admin CMS: challenge_templates, daily_challenges_override, story_chapters, game_config
-- הרץ ב-Supabase SQL Editor לפי הסדר

-- 1. תבניות אתגרים יומיים
CREATE TABLE IF NOT EXISTS public.challenge_templates (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('intercept_any','perfect_wave','combo','waves_completed')),
  title text NOT NULL,
  description text NOT NULL,
  target int NOT NULL CHECK (target > 0),
  reward text DEFAULT 'כוכב',
  sort_order int DEFAULT 0
);

ALTER TABLE public.challenge_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenge_templates_select_all" ON public.challenge_templates;
CREATE POLICY "challenge_templates_select_all" ON public.challenge_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "challenge_templates_admin_write" ON public.challenge_templates;
CREATE POLICY "challenge_templates_admin_write" ON public.challenge_templates
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

INSERT INTO public.challenge_templates (id, type, title, description, target, reward, sort_order)
VALUES
  ('intercept', 'intercept_any', 'יירט איומים', 'יירט 8 איומים במשחק אחד', 8, 'כוכב', 1),
  ('perfect', 'perfect_wave', 'גל מושלם', 'השלם גל ללא נזק לעיר', 1, 'כוכב', 2),
  ('combo', 'combo', 'קומבו', 'הגע לקומבו 10', 10, 'כוכב', 3),
  ('waves', 'waves_completed', 'גלים', 'השלם 3 גלים במשחק אחד', 3, 'כוכב', 4)
ON CONFLICT (id) DO NOTHING;

-- 2. דריסת אתגרים ליום מסוים
CREATE TABLE IF NOT EXISTS public.daily_challenges_override (
  date_key text PRIMARY KEY,
  challenges jsonb NOT NULL DEFAULT '[]'
);

ALTER TABLE public.daily_challenges_override ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_challenges_override_select_all" ON public.daily_challenges_override;
CREATE POLICY "daily_challenges_override_select_all" ON public.daily_challenges_override FOR SELECT USING (true);

DROP POLICY IF EXISTS "daily_challenges_override_admin_write" ON public.daily_challenges_override;
CREATE POLICY "daily_challenges_override_admin_write" ON public.daily_challenges_override
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- 3. פרקי סיפור (waves כ-JSON)
CREATE TABLE IF NOT EXISTS public.story_chapters (
  id text PRIMARY KEY,
  title text NOT NULL,
  narrative_text text NOT NULL,
  origin_key text,
  starting_budget int,
  waves jsonb NOT NULL DEFAULT '[]',
  sort_order int DEFAULT 0
);

ALTER TABLE public.story_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "story_chapters_select_all" ON public.story_chapters;
CREATE POLICY "story_chapters_select_all" ON public.story_chapters FOR SELECT USING (true);

DROP POLICY IF EXISTS "story_chapters_admin_write" ON public.story_chapters;
CREATE POLICY "story_chapters_admin_write" ON public.story_chapters
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- 4. הגדרות משחק (key-value)
CREATE TABLE IF NOT EXISTS public.game_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

ALTER TABLE public.game_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_config_select_all" ON public.game_config;
CREATE POLICY "game_config_select_all" ON public.game_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "game_config_admin_write" ON public.game_config;
CREATE POLICY "game_config_admin_write" ON public.game_config
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
