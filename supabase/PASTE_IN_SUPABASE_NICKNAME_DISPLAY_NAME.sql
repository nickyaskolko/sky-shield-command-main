-- ============================================================
-- כינוי בהרשמה → profiles.display_name
-- Supabase: Dashboard > SQL Editor > New query > הדבק והרץ
-- ============================================================
-- מתי להריץ:
--   • אם כבר הרצת את FULL_SCHEMA_ONE_FILE.sql (או המיגרציות) – בדרך כלל לא צריך.
--   • אם טבלת profiles קיימת אבל אין לך טריגר על auth.users, או שהטריגר לא מעתיק display_name – הרץ את הקובץ הזה.
-- ============================================================

-- וידוא שהעמודה display_name קיימת ב-profiles (אם לא – תתווסף)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text;

-- פונקציה: ביצירת משתמש חדש – ליצור שורת פרופיל עם display_name מהרשמה (כינוי)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (id) DO UPDATE SET display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- טריגר: אחרי INSERT ב-auth.users – להריץ את handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- סיום: כינוי שממלאים במסך הרשמה נשמר ב-user_metadata כ-display_name
--        והטריגר מעתיק אותו ל-profiles.display_name (או משאיר אימייל אם אין כינוי).
