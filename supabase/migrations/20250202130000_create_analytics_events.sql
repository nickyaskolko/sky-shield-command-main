-- ============================================================
-- Analytics Events – טבלת אירועים לאנליטיקס
-- הרץ את הקובץ ב-Supabase: SQL Editor > New query > הדבק והרץ
-- ============================================================

-- 1. יצירת הטבלה
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- זיהוי מבקר (אנונימי)
  visitor_id TEXT NOT NULL,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- סוג האירוע
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  
  -- מיקום (מה-IP)
  country TEXT,
  city TEXT,
  
  -- מכשיר
  device_type TEXT,
  browser TEXT,
  os TEXT,
  
  -- מידע נוסף
  referrer TEXT,
  page_url TEXT
);

-- 2. אינדקסים לשליפה מהירה
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor_id ON public.analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_country ON public.analytics_events(country);

-- 3. RLS – כל אחד יכול להוסיף, רק אדמין יכול לקרוא
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- מאפשר לכל אחד להוסיף אירוע (אנונימי או מחובר)
DROP POLICY IF EXISTS "analytics_insert_anyone" ON public.analytics_events;
CREATE POLICY "analytics_insert_anyone" ON public.analytics_events
  FOR INSERT WITH CHECK (true);

-- רק אדמינים יכולים לקרוא את האנליטיקס
DROP POLICY IF EXISTS "analytics_select_admin" ON public.analytics_events;
CREATE POLICY "analytics_select_admin" ON public.analytics_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- 4. פונקציה לסטטיסטיקות מהירות
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
