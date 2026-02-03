# מערכות יירוט מול סוגי מטרות

## מערכות (סוללות + לייזר)

| מערכת | מטרות (targetTypes) | הערות |
|--------|---------------------|--------|
| כיפת ברזל | rocket, drone | טווח קצר |
| פטריוט | cruise, drone, helicopter, fighter | טווח בינוני |
| חץ 3 | ballistic, helicopter, fighter | טווח ארוך |
| THAAD | drone, cruise, ballistic, fighter, helicopter, glide_bomb, stealth, armored, splitter | 20 טילים לסוללה, תחמושת בחנות |
| לייזר | **כל סוג** | ירי רצוף, מתחמם אחרי 3 שניות |

רדארים (basic / advanced / longRange) מזההים בלבד – לא מיירטים. סוללות מיירטות רק **בתוך טווח רדאר** (או כיסוי מלא).

---

## סוגי איומים – מי מיירט

| סוג | שם | מיירט |
|-----|-----|--------|
| rocket | טיל רגיל | כיפת ברזל |
| drone | כטב"ם | כיפת ברזל, פטריוט, THAAD |
| cruise | טיל שיוט | פטריוט, THAAD |
| ballistic | בליסטי | חץ 3, THAAD |
| fighter | מטוס קרב | פטריוט, חץ 3, THAAD |
| helicopter | מסוק | פטריוט, חץ 3, THAAD |
| glide_bomb | פצצה מתחלקת | THAAD, לייזר |
| stealth | חמקן | THAAD, לייזר |
| armored | משוריין | THAAD, לייזר |
| splitter | מתפצל | THAAD, לייזר |
| swarm | נחיל | לייזר |
| decoy | דמה | כל מערכת |
| emp | EMP | **לייזר בלבד** |

EMP = פולס אלקטרומגנטי (איום במשחק); בקוד יש `empRadius`.
