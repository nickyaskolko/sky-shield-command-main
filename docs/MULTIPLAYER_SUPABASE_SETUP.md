# הגדרת Supabase למשחק משותף (קואופ)

## 1. איזה מיגרציה להריץ ב-Supabase SQL

הרץ את **כל התוכן** של הקובץ:

**`supabase/migrations/20250206120000_multiplayer_rooms.sql`**

### איך להריץ

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard) ובחר את הפרויקט.
2. בתפריט השמאלי: **SQL Editor**.
3. לחץ **New query**.
4. העתק את כל התוכן של הקובץ `supabase/migrations/20250206120000_multiplayer_rooms.sql` (מהשורה הראשונה עד האחרונה).
5. הדבק בחלון ה-SQL.
6. לחץ **Run** (או Ctrl+Enter).

אם ההרצה הצליחה – תיווצר הטבלה `multiplayer_rooms`, הטיפוס `multiplayer_room_status`, והפונקציה `join_multiplayer_room`. אם כבר הרצת מיגרציה דומה בעבר, ייתכן שיהיו שגיאות על "already exists" – אז אפשר להריץ רק את החלקים שחסרים או לדלג על שורות שכבר קיימות.

---

## 2. איך לוודא ש-Realtime מופעל

Realtime משמש ל-Broadcast ו-Presence (סנכרון משחק משותף). ב-Supabase הוא בדרך כלל **מופעל כברירת מחדל**.

### בדיקה / הפעלה

1. ב-Supabase Dashboard: **Project Settings** (איקון גלגל שיניים בתחתית התפריט השמאלי).
2. בתפריט המשני: **API**.
3. גלול לחלק **Project URL** ו-**anon key** – אם הם קיימים, ה-API (כולל Realtime) זמין.

או:

1. **Project Settings** → **Realtime** (אם קיים בתפריט).
2. וודא ש-**Realtime** מופעל (Enable Realtime / Realtime service enabled).

אם אין לך כרטיסייה "Realtime" ב-Settings, ב-Projects חדשים Realtime מופעל אוטומטית; הקוד משתמש ב-`supabase.channel()` ו-`channel.send()` שפועלים מול שירות Realtime של Supabase.

### בדיקה מהאפליקציה

אחרי הרצת המיגרציה והפעלת האפליקציה:

- לחץ "משחק עם חבר" → "צור חדר".
- אם אתה רואה קוד חדר ו"מחכה לשחקן שני" בלי שגיאות ברשת – החיבור ל-Realtime עובד.

אם יש שגיאות (למשל ב-Console או ב-Network) – בדוק ש-`VITE_SUPABASE_URL` ו-`VITE_SUPABASE_ANON_KEY` ב-`.env.local` מצביעים לפרויקט הנכון ושהמיגרציה הורצה בהצלחה.
