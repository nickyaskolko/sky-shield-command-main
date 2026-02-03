-- ============================================================
-- Sky Shield Command – Supabase schema
-- הרץ את הקובץ ב-Supabase: SQL Editor > New query > הדבק והרץ
-- ============================================================

-- 1. Profiles – פרופיל משתמש (מקושר ל-Auth)
-- נוצר אוטומטית אחרי הרשמה/התחברות
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  settings jsonb DEFAULT '{}',
  stats jsonb DEFAULT '{"totalGamesPlayed":0,"totalInterceptions":0,"totalWavesCompleted":0,"highestWave":0,"highestScore":0,"highestCombo":0,"perfectWaves":0,"batteriesUsedTypes":[]}',
  achievements jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Game scores – ציוני משחק (high scores)
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

-- 3. Purchases – רכישות (חנות פרימיום / Rapyd)
-- product_id = remove_ads | premium_monthly | premium_yearly | ammo_boost | theme_pack
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

-- 4. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Profiles: משתמש רואה/מעדכן רק את הפרופיל שלו.
-- מיגרציות: 20250130120000 מוסיפה profiles_select_admin (אדמין רואה כולם);
-- 20250202120000 מוסיפה profiles_update_admin (אדמין יכול לאפס פרופיל).
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Game scores: משתמש רואה/מוסיף רק ציונים שלו
DROP POLICY IF EXISTS "game_scores_select_own" ON public.game_scores;
CREATE POLICY "game_scores_select_own" ON public.game_scores FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "game_scores_insert_own" ON public.game_scores;
CREATE POLICY "game_scores_insert_own" ON public.game_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Purchases: משתמש רואה רק רכישות שלו
DROP POLICY IF EXISTS "purchases_select_own" ON public.purchases;
CREATE POLICY "purchases_select_own" ON public.purchases FOR SELECT USING (auth.uid() = user_id);
-- הוספת רכישה רק דרך backend (service role) או אם תרצה מהלקוח – אפשר INSERT עם CHECK (auth.uid() = user_id)
DROP POLICY IF EXISTS "purchases_insert_own" ON public.purchases;
CREATE POLICY "purchases_insert_own" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Trigger: עדכון updated_at ב-profiles
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

-- 6. (אופציונלי) פרופיל אוטומטי אחרי הרשמה
-- אם תקבל שגיאת הרשאה על auth.users – מחק את הבלוק הזה ותיצור פרופיל מהאפליקציה בהתחברות ראשונה.
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

-- ============================================================
-- 7. Analytics Events – טבלת אירועים לאנליטיקס
-- ============================================================

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
CREATE POLICY "analytics_insert_anyone" ON public.analytics_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_select_admin" ON public.analytics_events;
CREATE POLICY "analytics_select_admin" ON public.analytics_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- פונקציה לסטטיסטיקות מהירות
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
    WHERE event_type = 'page_view' 
      AND country IS NOT NULL
      AND created_at >= now() - (days_back || ' days')::INTERVAL
    GROUP BY country
    ORDER BY cnt DESC
    LIMIT 1
  )
  SELECT 
    s.total_visits,
    s.unique_visitors,
    s.games_started,
    COALESCE(t.country, 'לא ידוע') AS top_country,
    COALESCE(t.cnt, 0) AS top_country_count
  FROM stats s
  LEFT JOIN top_c t ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
