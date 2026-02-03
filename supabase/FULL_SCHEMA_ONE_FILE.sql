-- ============================================================
-- Sky Shield Command – כל הסכמה והמיגרציות בקובץ אחד
-- Supabase: SQL Editor > New query > הדבק והרץ את כל הקובץ
-- אחרי ההרצה: הוסף אדמין ראשון (החלף UUID):
--   INSERT INTO public.admin_users (user_id) VALUES ('-UUID-שלך-מ-Authentication');
-- ============================================================

-- ========== 1. סכמה בסיסית: profiles, game_scores, purchases, RLS ==========
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  settings jsonb DEFAULT '{}',
  stats jsonb DEFAULT '{"totalGamesPlayed":0,"totalInterceptions":0,"totalWavesCompleted":0,"highestWave":0,"highestScore":0,"highestCombo":0,"perfectWaves":0,"batteriesUsedTypes":[]}',
  achievements jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  diamonds int DEFAULT 0,
  banned boolean NOT NULL DEFAULT false,
  banned_reason text,
  banned_at timestamptz,
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score int NOT NULL,
  wave int NOT NULL,
  total_interceptions int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON public.game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_score ON public.game_scores(score DESC);

CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  purchased_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  rapyd_payment_id text
);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON public.purchases(product_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "game_scores_select_own" ON public.game_scores;
CREATE POLICY "game_scores_select_own" ON public.game_scores FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "game_scores_insert_own" ON public.game_scores;
CREATE POLICY "game_scores_insert_own" ON public.game_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "purchases_select_own" ON public.purchases;
CREATE POLICY "purchases_select_own" ON public.purchases FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "purchases_insert_own" ON public.purchases;
CREATE POLICY "purchases_insert_own" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== 2. אדמין – טבלה וגישה ==========
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select_own" ON public.admin_users;
CREATE POLICY "admin_users_select_own" ON public.admin_users
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "game_scores_select_admin" ON public.game_scores;
CREATE POLICY "game_scores_select_admin" ON public.game_scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- ========== 3. CMS – אתגרים, סיפור, הגדרות ==========
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

-- ========== 4. RLS – אדמין יכול לעדכן (איפוס) פרופיל ==========
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- ========== 5. יהלומים בפרופיל ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diamonds integer NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.profiles.diamonds IS 'יהלומים – מסונכרן עם הלקוח, מאפס באדמין, תורם מקבל 2000';

-- ========== 6. אנליטיקס ==========
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  visitor_id TEXT NOT NULL,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  referrer TEXT,
  page_url TEXT
);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor_id ON public.analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_country ON public.analytics_events(country);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analytics_insert_anyone" ON public.analytics_events;
CREATE POLICY "analytics_insert_anyone" ON public.analytics_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "analytics_select_admin" ON public.analytics_events;
CREATE POLICY "analytics_select_admin" ON public.analytics_events
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.get_analytics_summary(days_back INT DEFAULT 7)
RETURNS TABLE (
  total_visits BIGINT,
  unique_visitors BIGINT,
  games_started BIGINT,
  top_country TEXT,
  top_country_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE event_type = 'page_view') AS total_visits,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view') AS unique_visitors,
      COUNT(*) FILTER (WHERE event_type = 'game_start') AS games_started
    FROM public.analytics_events
    WHERE created_at >= now() - (days_back || ' days')::INTERVAL
  ),
  top_c AS (
    SELECT country, COUNT(*) AS cnt
    FROM public.analytics_events
    WHERE event_type = 'page_view' AND country IS NOT NULL
      AND created_at >= now() - (days_back || ' days')::INTERVAL
    GROUP BY country
    ORDER BY cnt DESC
    LIMIT 1
  )
  SELECT s.total_visits, s.unique_visitors, s.games_started,
    COALESCE(t.country, 'לא ידוע'), COALESCE(t.cnt, 0)
  FROM stats s LEFT JOIN top_c t ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 7. תבניות אתגרים נוספות ==========
INSERT INTO public.challenge_templates (id, type, title, description, target, reward, sort_order)
VALUES
  ('intercept_15', 'intercept_any', 'יירט 15', 'יירט 15 איומים במשחק אחד', 15, 'כוכב', 5),
  ('perfect_3', 'perfect_wave', 'שלושה גלים מושלמים', 'השלם 3 גלים ברצף ללא נזק לעיר', 3, 'כוכב', 6),
  ('combo_15', 'combo', 'קומבו 15', 'הגע לקומבו 15', 15, 'כוכב', 7),
  ('waves_5', 'waves_completed', 'חמישה גלים', 'השלם 5 גלים במשחק אחד', 5, 'כוכב', 8),
  ('waves_7', 'waves_completed', 'שבעה גלים', 'השלם 7 גלים במשחק אחד', 7, 'כוכב', 9)
ON CONFLICT (id) DO NOTHING;

-- ========== סיום. הוסף אדמין ראשון (החלף ב-UUID האמיתי): ==========
-- INSERT INTO public.admin_users (user_id) VALUES ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
