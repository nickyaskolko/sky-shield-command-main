# אנליטיקס ב-Supabase – מה להריץ ושאילתות שימושיות

## מיגרציה מומלצת – כל המדדים + מבקרים אונליין

כדי שדף האדמין יציג את **כל** המדדים (כולל story_starts, shop_opens וכו') ואת **מבקרים אונליין**, הרץ את המיגרציה:

**`supabase/migrations/20250207120000_extended_analytics_rpcs.sql`**

ב-Supabase → SQL Editor: העתק את כל התוכן של הקובץ והרץ. המיגרציה מעדכנת את `get_analytics_summary` (16 עמודות) ומוסיפה את `get_active_visitors_count`. אם לא תריץ – האדמין יציג 0 במדדים הנוספים ו"—" במבקרים אונליין.

---

## אין צורך בשינוי סכמה

טבלת `analytics_events` כבר כוללת עמודה **`event_data` (JSONB)** – כל הנתונים החדשים (סיבת אירוע, גל, קומבו, וכו') נשמרים שם. **אין צורך להריץ מיגרציה חדשה** כדי שהאירועים החדשים יעבדו.

---

## 1. עדכון פונקציית הסיכום (אופציונלי)

אם תרצה שהדשבורד באדמין יציג גם ספירות לאירועים החדשים, הרץ ב-**Supabase → SQL Editor** את הקוד הבא. זה מעדכן את `get_analytics_summary` כך שתחזיר עמודות נוספות:

```sql
-- עדכון get_analytics_summary – הוספת מדדים לאירועים החדשים
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
    COALESCE(t.country, 'לא ידוע') AS top_country,
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
```

**הערה:** אם דשבורד האדמין משתמש רק ב־`total_visits`, `unique_visitors`, `games_started`, `top_country` – הפונקציה הקיימת ממשיכה לעבוד. עדכון זה מוסיף עמודות; אם לא תעדכן את ה־Admin להציג אותן, הן פשוט לא יוצגו.

---

## 2. שאילתות שימושיות לניתוח (להריץ ב-SQL Editor)

### אירועי חסימה (משתמשים חסומים שניסו להתחבר)
```sql
SELECT created_at, user_id, event_data->>'user_id' AS event_user_id, country
FROM public.analytics_events
WHERE event_type = 'auth_blocked'
ORDER BY created_at DESC
LIMIT 100;
```

### התחלות משחק – גלים vs סיפור, עם/בלי שמירה
```sql
SELECT 
  event_data->>'mode' AS mode,
  (event_data->>'has_saved_game')::boolean AS has_saved_game,
  COUNT(*) AS cnt
FROM public.analytics_events
WHERE event_type = 'game_start'
  AND created_at >= now() - interval '30 days'
GROUP BY 1, 2
ORDER BY 3 DESC;
```

### גלים שהושלמו – כולל גל מושלם וקומבו
```sql
SELECT 
  (event_data->>'wave')::int AS wave,
  (event_data->>'score')::int AS score,
  (event_data->>'perfect')::boolean AS perfect,
  (event_data->>'combo_max')::int AS combo_max,
  created_at
FROM public.analytics_events
WHERE event_type = 'wave_complete'
  AND created_at >= now() - interval '7 days'
ORDER BY created_at DESC
LIMIT 200;
```

### סוף משחק – גל וניקוד
```sql
SELECT 
  (event_data->>'wave')::int AS wave,
  (event_data->>'score')::int AS score,
  (event_data->>'wavesCompleted')::int AS waves_completed,
  created_at
FROM public.analytics_events
WHERE event_type = 'game_over'
  AND created_at >= now() - interval '7 days'
ORDER BY created_at DESC
LIMIT 200;
```

### רכישות – לפי פריט ומטבע
```sql
SELECT 
  event_data->>'itemId' AS item_id,
  event_data->>'currency' AS currency,
  (event_data->>'price')::numeric AS price,
  COUNT(*) AS cnt
FROM public.analytics_events
WHERE event_type = 'purchase'
  AND created_at >= now() - interval '30 days'
GROUP BY 1, 2, 3
ORDER BY cnt DESC;
```

### פרס יומי – ימים ויהלומים
```sql
SELECT 
  (event_data->>'day')::int AS day,
  (event_data->>'diamonds')::int AS diamonds,
  COUNT(*) AS claims,
  COUNT(DISTINCT visitor_id) AS unique_visitors
FROM public.analytics_events
WHERE event_type = 'daily_reward_claim'
  AND created_at >= now() - interval '30 days'
GROUP BY 1, 2
ORDER BY 1, 2;
```

### הדרכה – התחלה, סיום, דילוג
```sql
SELECT 
  event_type,
  COUNT(*) AS cnt
FROM public.analytics_events
WHERE event_type IN ('tutorial_start', 'tutorial_complete', 'tutorial_skip')
  AND created_at >= now() - interval '30 days'
GROUP BY event_type;
```

### המשך משחק vs כישלון
```sql
SELECT 
  event_type,
  COUNT(*) AS cnt
FROM public.analytics_events
WHERE event_type IN ('saved_game_continue', 'resume_fail')
  AND created_at >= now() - interval '30 days'
GROUP BY event_type;
```

### מצב סיפור – פרקים שהתחילו והושלמו
```sql
-- התחלות פרק
SELECT event_data->>'chapter_id' AS chapter_id, COUNT(*) AS starts
FROM public.analytics_events
WHERE event_type = 'story_start'
  AND created_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 2 DESC;

-- פרקים שהושלמו
SELECT event_data->>'chapter_id' AS chapter_id, (event_data->>'wave')::int AS wave, COUNT(*) AS completes
FROM public.analytics_events
WHERE event_type = 'story_chapter_complete'
  AND created_at >= now() - interval '30 days'
GROUP BY 1, 2
ORDER BY 3 DESC;
```

### צפיות בדף – עם path ומחובר/לא
```sql
SELECT 
  event_data->>'path' AS path,
  (event_data->>'is_logged_in')::boolean AS is_logged_in,
  COUNT(*) AS cnt
FROM public.analytics_events
WHERE event_type = 'page_view'
  AND created_at >= now() - interval '7 days'
GROUP BY 1, 2
ORDER BY 3 DESC;
```

---

## 3. אינדקס ל־event_type + created_at (אופציונלי, לביצועים)

אם יש הרבה שורות ושאילתות לפי `event_type` ו־`created_at` איטיות:

```sql
CREATE INDEX IF NOT EXISTS idx_analytics_event_type_created 
ON public.analytics_events(event_type, created_at DESC);
```

---

## סיכום אירועים שנשלחים מהאפליקציה

| event_type | תיאור | שדות ב-event_data (דוגמאות) |
|------------|--------|------------------------------|
| `page_view` | צפייה בדף | path, is_logged_in |
| `game_start` | התחלת משחק | mode, has_saved_game |
| `wave_complete` | גל הושלם | wave, score, perfect, combo_max |
| `game_over` | סוף משחק | score, wavesCompleted, wave, time_played_seconds |
| `shop_open` | פתיחת חנות | — |
| `purchase` | רכישה | itemId, price, currency |
| `challenge_complete` | אתגר הושלם | challengeId |
| `auth_blocked` | משתמש חסום ניסה להתחבר | user_id |
| `story_start` | התחלת מצב סיפור | chapter_id |
| `story_chapter_complete` | פרק סיפור הושלם | chapter_id, wave |
| `daily_reward_claim` | קבלת פרס יומי | day, diamonds |
| `tutorial_start` | הדרכה נפתחה | — |
| `tutorial_complete` | הדרכה הושלמה | — |
| `tutorial_skip` | דילוג על הדרכה | step |
| `saved_game_continue` | המשך משחק מהשמירה | — |
| `resume_fail` | ניסיון להמשיך בלי שמירה | — |
