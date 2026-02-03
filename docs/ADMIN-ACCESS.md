# גישת אדמין – רק משתמשים עם רול אדמין

## איך זה עובד

- **נתיב**: `/admin` – פאנל אדמין.
- **חסימה**: רק משתמש שמופיע בטבלה `public.admin_users` רואה את הפאנל. כל השאר מקבלים מסך **"אין לך גישה לפאנל זה"** וכפתור חזרה לדף הבית.
- **בדיקה**: האפליקציה בודקת מול Supabase אם `auth.uid()` קיים ב־`admin_users`. אם לא – `access = 'denied'` והתוכן לא מוצג.

## SQL נדרש ב-Supabase

1. **טבלת אדמינים** (מיגרציה `20250130120000_create_admin_users.sql`):
   - טבלה `public.admin_users` עם עמודה `user_id` (מפנה ל־`auth.users(id)`).
   - RLS: משתמש יכול רק לבדוק אם **הוא עצמו** אדמין (`SELECT WHERE user_id = auth.uid()`).
   - פוליסה `profiles_select_admin`: אדמין יכול לראות את **כל** הפרופילים (לטאב "משתמשים").

2. **הוספת אדמין ראשון** (ב-SQL Editor ב-Supabase, עם הרשאות מתאימות):
   ```sql
   INSERT INTO public.admin_users (user_id) VALUES ('uuid-of-your-auth-user');
   ```
   את ה־UUID תקבל מ־Auth: Dashboard → Users → העתקת ה-ID של המשתמש.

3. **אם טאב "משתמשים" ריק**:
   - ודא שהמיגרציה `20250130120000_create_admin_users.sql` הורצה (כולל הפוליסה `profiles_select_admin`).
   - אם הורצת רק חלק – הרץ את כל המיגרציה מחדש או הוסף ידנית:
   ```sql
   DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
   CREATE POLICY "profiles_select_admin" ON public.profiles
     FOR SELECT USING (
       EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
     );
   ```

## סיכום

| מי | גישה ל־/admin |
|----|----------------|
| לא מחובר | "אין גישה" + חזרה לדף הבית |
| מחובר אבל לא ב־admin_users | "אין גישה" + חזרה לדף הבית |
| מחובר ו־user_id ב־admin_users | רואה את כל הפאנל (סטטיסטיקות, משתמשים, אתגרים וכו') |

אין צורך במיגרציה SQL נוספת רק לחסימת גישה – החסימה מתבצעת באפליקציה לפי `admin_users`.
