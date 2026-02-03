-- Admin users – רק משתמשים ברשימה יכולים לגשת לפאנל אדמין
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- משתמש יכול לבדוק רק אם הוא עצמו אדמין (לבדיקת גישה לפאנל)
DROP POLICY IF EXISTS "admin_users_select_own" ON public.admin_users;
CREATE POLICY "admin_users_select_own" ON public.admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- הוספה/עדכון/מחיקה רק דרך Dashboard (service role) או אדמין עתידי
-- אין מדיניות INSERT/UPDATE/DELETE ל-anon – מוסיפים אדמינים ב-SQL Editor או Dashboard

-- אדמין יכול לראות את כל הפרופילים והציונים (לסטטיסטיקות)
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

-- הערה: כדי להוסיף אדמין ראשון, הרץ ב-SQL Editor (כ-Service role או אחרי הוספת user_id ידנית):
-- INSERT INTO public.admin_users (user_id) VALUES ('uuid-of-admin-user');
