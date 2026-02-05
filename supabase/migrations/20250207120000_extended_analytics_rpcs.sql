-- Extended analytics RPCs – תואם לדף האדמין (כל המדדים + מבקרים אונליין)
-- הרץ אם כבר הרצת 20250202130000_create_analytics_events – מעדכן את get_analytics_summary ומוסיף get_active_visitors_count

DROP FUNCTION IF EXISTS public.get_analytics_summary(integer);
DROP FUNCTION IF EXISTS public.get_analytics_summary(int);

CREATE OR REPLACE FUNCTION public.get_analytics_summary(days_back INT DEFAULT 7)
RETURNS TABLE (
  total_visits BIGINT,
  unique_visitors BIGINT,
  games_started BIGINT,
  top_country TEXT,
  top_country_count BIGINT,
  auth_blocked_count BIGINT,
  story_starts BIGINT,
  story_chapters_completed BIGINT,
  daily_reward_claims BIGINT,
  tutorial_starts BIGINT,
  tutorial_completes BIGINT,
  tutorial_skips BIGINT,
  saved_game_continues BIGINT,
  resume_fails BIGINT,
  shop_opens BIGINT,
  purchases_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE event_type = 'page_view') AS total_visits,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view') AS unique_visitors,
      COUNT(*) FILTER (WHERE event_type = 'game_start') AS games_started,
      COUNT(*) FILTER (WHERE event_type = 'auth_blocked') AS auth_blocked_count,
      COUNT(*) FILTER (WHERE event_type = 'story_start') AS story_starts,
      COUNT(*) FILTER (WHERE event_type = 'story_chapter_complete') AS story_chapters_completed,
      COUNT(*) FILTER (WHERE event_type = 'daily_reward_claim') AS daily_reward_claims,
      COUNT(*) FILTER (WHERE event_type = 'tutorial_start') AS tutorial_starts,
      COUNT(*) FILTER (WHERE event_type = 'tutorial_complete') AS tutorial_completes,
      COUNT(*) FILTER (WHERE event_type = 'tutorial_skip') AS tutorial_skips,
      COUNT(*) FILTER (WHERE event_type = 'saved_game_continue') AS saved_game_continues,
      COUNT(*) FILTER (WHERE event_type = 'resume_fail') AS resume_fails,
      COUNT(*) FILTER (WHERE event_type = 'shop_open') AS shop_opens,
      COUNT(*) FILTER (WHERE event_type = 'purchase') AS purchases_count
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
    COALESCE(t.country, 'לא ידוע')::TEXT AS top_country,
    COALESCE(t.cnt, 0)::BIGINT AS top_country_count,
    s.auth_blocked_count,
    s.story_starts,
    s.story_chapters_completed,
    s.daily_reward_claims,
    s.tutorial_starts,
    s.tutorial_completes,
    s.tutorial_skips,
    s.saved_game_continues,
    s.resume_fails,
    s.shop_opens,
    s.purchases_count
  FROM stats s
  LEFT JOIN top_c t ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- מבקרים אונליין – מבקרים עם אירוע ב-X דקות אחרונות
DROP FUNCTION IF EXISTS public.get_active_visitors_count(integer);
CREATE OR REPLACE FUNCTION public.get_active_visitors_count(minutes_back INT DEFAULT 5)
RETURNS BIGINT AS $$
  SELECT COALESCE(COUNT(DISTINCT visitor_id), 0)::BIGINT
  FROM public.analytics_events
  WHERE created_at >= now() - (minutes_back || ' minutes')::INTERVAL;
$$ LANGUAGE sql SECURITY DEFINER;
