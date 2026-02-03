-- RLS: אדמין יכול לעדכן (איפוס) כל פרופיל
-- יחד עם profiles_select_admin (ממיגרציה קודמת): אדמין רואה את כל הפרופילים ויכול לאפס סטטיסטיקות/הישגים

-- SELECT: משתמש רואה את הפרופיל שלו; אדמין רואה את כולם (profiles_select_own + profiles_select_admin כבר קיימים)

-- UPDATE: משתמש מעדכן רק את הפרופיל שלו; אדמין יכול לעדכן כל פרופיל (לאיפוס משתמש)
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- הערה: ב-Postgres מספר פוליסות לאותה פעולה מתאחדות ב-OR.
-- לכן: UPDATE מותר אם (auth.uid() = id) [profiles_update_own] או אם המשתמש באדמין [profiles_update_admin].
