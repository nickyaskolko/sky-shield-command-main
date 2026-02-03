-- More daily challenge templates – תבניות אתגרים יומיים נוספות
INSERT INTO public.challenge_templates (id, type, title, description, target, reward, sort_order)
VALUES
  ('intercept_15', 'intercept_any', 'יירט 15', 'יירט 15 איומים במשחק אחד', 15, 'כוכב', 5),
  ('perfect_3', 'perfect_wave', 'שלושה גלים מושלמים', 'השלם 3 גלים ברצף ללא נזק לעיר', 3, 'כוכב', 6),
  ('combo_15', 'combo', 'קומבו 15', 'הגע לקומבו 15', 15, 'כוכב', 7),
  ('waves_5', 'waves_completed', 'חמישה גלים', 'השלם 5 גלים במשחק אחד', 5, 'כוכב', 8),
  ('waves_7', 'waves_completed', 'שבעה גלים', 'השלם 7 גלים במשחק אחד', 7, 'כוכב', 9)
ON CONFLICT (id) DO NOTHING;
