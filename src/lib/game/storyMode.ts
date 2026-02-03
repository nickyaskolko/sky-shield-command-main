// Story mode – עלילה וגלים מיוחדים (פרקים מ-Supabase עם fallback לקוד)

import type { ThreatSpawn } from './waves';
import type { WaveConfig } from './waves';
import type { OriginKey } from './threatSpawnLocations';
import { supabase } from '@/lib/supabase';

export interface StoryWaveSpec {
  threats: ThreatSpawn[];
  spawnInterval: number;
  description?: string;
  /** סיפור בין גל לגל – מוצג בחנות אחרי סיום הגל, לפני המעבר לגל הבא */
  narrativeBetween?: string;
}

export interface StoryChapter {
  id: string;
  title: string;
  narrativeText: string;
  waves: StoryWaveSpec[];
  /** If set, land threats (rocket/cruise/ballistic) in this chapter spawn from this origin (e.g. "גזה" → gaza). */
  originKey?: OriginKey;
  /** Starting budget for this chapter (default: STORY_MODE_STARTING_BUDGET). */
  startingBudget?: number;
}

let chaptersCache: StoryChapter[] | null = null;

/** Fetch story chapters from Supabase and cache. Call once at app init or when opening story menu. If table missing (400) or RLS blocks, uses static STORY_CHAPTERS. */
export async function fetchStoryChapters(): Promise<StoryChapter[]> {
  try {
    const { data, error } = await supabase
      .from('story_chapters')
      .select('id, title, narrative_text, origin_key, starting_budget, waves, sort_order')
      .order('sort_order', { ascending: true });
    if (error || !data || data.length === 0) {
      chaptersCache = null;
      return [...STORY_CHAPTERS];
    }
    const chapters: StoryChapter[] = data.map((row: {
      id: string;
      title: string;
      narrative_text: string;
      origin_key: string | null;
      starting_budget: number | null;
      waves: unknown;
    }) => ({
      id: row.id,
      title: row.title,
      narrativeText: row.narrative_text,
      originKey: (row.origin_key as OriginKey) ?? undefined,
      startingBudget: row.starting_budget ?? undefined,
      waves: Array.isArray(row.waves) ? (row.waves as StoryWaveSpec[]) : [],
    })).filter(c => c.waves.length > 0);
    chaptersCache = chapters;
    return chapters;
  } catch {
    chaptersCache = null;
    return [...STORY_CHAPTERS];
  }
}

/** Sync: returns cached chapters or static STORY_CHAPTERS. Ensure fetchStoryChapters() was called for fresh data. */
function getChapters(): StoryChapter[] {
  return chaptersCache ?? STORY_CHAPTERS;
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'ch1',
    title: 'פרק 1: ההתחלה',
    narrativeText: 'מערכת "מגן השמיים" מופעלת לראשונה. המרכז הבקרה מדווח על שיגורים מעזה – האויב שולח גל טילים קצר. עליך להציב רדאר כדי לזהות את האיומים, ולבנות סוללות יירוט (כיפת ברזל) לפני שהטילים מגיעים לערים. כל פגיעה בעיר פוגעת במורל – המשימה היא להגן על האזרחים.',
    originKey: 'gaza',
    waves: [
      {
        threats: [{ type: 'rocket', count: 2, delay: 0 }],
        spawnInterval: 4500,
        description: 'גל טילים ראשון',
        narrativeBetween: 'גל ראשון הושלם. המודיעין מעדכן: האויב מתכוון להמשיך את ההרעשה. חיזק את כיסוי הרדאר ופרוס סוללה נוספת אם יש תקציב – הגל הבא צפוף יותר.',
      },
      {
        threats: [{ type: 'rocket', count: 3, delay: 0 }],
        spawnInterval: 3800,
        description: 'עוד טילים',
        narrativeBetween: 'שני גלים מאחוריך. מרכז הבקרה מזהה גם מל"ט בדרך – בגל השלישי תפגוש טילים ורחפן. וודא שיש לך כיסוי רדאר וסוללה שמסוגלת ליירט גם כטב"מים.',
      },
      {
        threats: [
          { type: 'rocket', count: 3, delay: 0 },
          { type: 'drone', count: 1, delay: 3000 },
        ],
        spawnInterval: 3200,
        description: 'טילים ורחפן',
      },
    ],
  },
  {
    id: 'ch2',
    title: 'פרק 2: טילי שיוט',
    narrativeText: 'המודיעין מדווח: האויב משגר טילי שיוט – טילים שטסים נמוך ומתמרנים, קשים יותר לזיהוי. סוללות הפטריוט (טווח בינוני) מסוגלות ליירט אותם. וודא שיש לך כיסוי רדאר טוב וסוללה עם טווח מספיק – טיל שיוט שלא מיירטים עלול לפגוע בעיר.',
    waves: [
      {
        threats: [
          { type: 'rocket', count: 2, delay: 0 },
          { type: 'cruise', count: 1, delay: 4000 },
        ],
        spawnInterval: 3500,
        description: 'טיל שיוט ראשון',
        narrativeBetween: 'טיל השיוט הראשון יורט. האויב לא נעצר – הגל הבא כולל רקטות ויותר טילי שיוט. שדרג או הוסף סוללות פטריוט ובדוק שכל אזור מכוסה.',
      },
      {
        threats: [
          { type: 'rocket', count: 4, delay: 0 },
          { type: 'cruise', count: 2, delay: 2500 },
        ],
        spawnInterval: 2800,
        description: 'שני טילי שיוט',
      },
    ],
  },
  {
    id: 'ch3',
    title: 'פרק 3: התקפה מאיראן',
    narrativeText: 'איראן שולחת גל טילים ורחפנים ישירות לעבר ישראל – טילים בליסטיים, טילי שיוט ומל"טים. זהו תרחיש רב־זירתי: רק רדאר ארוך טווח ומערכות חץ 3 (או דוד/חץ 2) יכולות ליירט בליסטיים. מבוסס על אירועי אפריל 2024.',
    waves: [
      {
        threats: [
          { type: 'drone', count: 2, delay: 0 },
          { type: 'cruise', count: 1, delay: 3000 },
        ],
        spawnInterval: 3500,
        description: 'מל"טים וטיל שיוט מאיראן',
        narrativeBetween: 'הגל הראשון הושלם. המודיעין מזהיר: שיגור בליסטי צפוי – בגל הבא יופיעו גם טילים בליסטיים. ללא סוללת חץ 3 או דוד לא תוכל ליירט אותם. הכן רדאר ארוך טווח וסוללה מתאימה.',
      },
      {
        threats: [
          { type: 'rocket', count: 3, delay: 0 },
          { type: 'cruise', count: 2, delay: 2000 },
          { type: 'ballistic', count: 1, delay: 5000 },
        ],
        spawnInterval: 2800,
        description: 'גל מעורב – בליסטי ראשון',
        narrativeBetween: 'גל מעורב הושלם – כולל בליסטי. הגל האחרון בפרק זה הוא הלחץ המקסימלי: מל"טים, שיוט ובליסטיים במקביל. תגבור סוללות וניהול תחמושת יקבעו את התוצאה.',
      },
      {
        threats: [
          { type: 'drone', count: 3, delay: 0 },
          { type: 'cruise', count: 2, delay: 2500 },
          { type: 'ballistic', count: 2, delay: 4000 },
        ],
        spawnInterval: 2200,
        description: 'לחץ מלא – חץ 3 נדרש',
      },
    ],
  },
  {
    id: 'ch4',
    title: 'פרק 4: איום מתימן',
    narrativeText: 'החות\'ים בתימן משגרים טילים בליסטיים ורחפנים לעבר אילת והדרום. המרחק הגדול דורש רדאר ארוך טווח וסוללות חץ 3 או דוד. הגן על אילת ועל הערים בדרום – כל פגיעה מורידה מורל.',
    waves: [
      {
        threats: [
          { type: 'rocket', count: 2, delay: 0 },
          { type: 'ballistic', count: 1, delay: 4500 },
        ],
        spawnInterval: 3800,
        description: 'בליסטי מתימן לעבר הדרום',
        narrativeBetween: 'בליסטי ראשון מתימן יורט. האויב מגדיל את הפעילות – בגל הבא: מל"טים ובליסטיים יחד. פרוס כיסוי גם נגד נמוכים (פטריוט/כיפת ברזל) וגם נגד בליסטי (חץ 3/דוד).',
      },
      {
        threats: [
          { type: 'drone', count: 2, delay: 0 },
          { type: 'ballistic', count: 2, delay: 3500 },
        ],
        spawnInterval: 3000,
        description: 'גל כפול – מל"טים ובליסטיים',
        narrativeBetween: 'שני גלים הושלמו. הגל השלישי והאחרון בפרק: רקטות, מל"טים ובליסטיים במקביל – התקפה מתימן במלוא העוצמה. הגן על אילת.',
      },
      {
        threats: [
          { type: 'rocket', count: 3, delay: 0 },
          { type: 'drone', count: 2, delay: 2000 },
          { type: 'ballistic', count: 2, delay: 4000 },
        ],
        spawnInterval: 2400,
        description: 'התקפה מתימן – הגן על אילת',
      },
    ],
  },
  {
    id: 'ch5',
    title: 'פרק 5: עיראק וסוריה',
    narrativeText: 'במסגרת מתקפה רב־זירתית, טילים נורים גם מעיראק וסוריה – צפון ומזרח. כיסוי רדאר בצפון ובמזרח חיוני; פטריוט נגד שיוט ורקטות, חץ 3 או דוד נגד בליסטיים. יירוט מסונכרן על כל הגזרות – הערים בצפון ובמרכז במרכבת האש.',
    waves: [
      {
        threats: [
          { type: 'rocket', count: 4, delay: 0 },
          { type: 'cruise', count: 1, delay: 3500 },
        ],
        spawnInterval: 3200,
        description: 'טילים מהצפון והמזרח',
        narrativeBetween: 'גל ראשון מהצפון והמזרח הושלם. המודיעין: הגל הבא יכלול גם טיל בליסטי – וודא סוללה ארוכת טווח ופריסה נכונה.',
      },
      {
        threats: [
          { type: 'rocket', count: 4, delay: 0 },
          { type: 'cruise', count: 2, delay: 2500 },
          { type: 'ballistic', count: 1, delay: 5000 },
        ],
        spawnInterval: 2600,
        description: 'גל מעורב – עיראק וסוריה',
        narrativeBetween: 'גל מעורב הושלם. הגל האחרון: מתקפה מלאה – רקטות, מל"טים, שיוט ובליסטיים. הגן על כל הערים.',
      },
      {
        threats: [
          { type: 'rocket', count: 5, delay: 0 },
          { type: 'drone', count: 2, delay: 1500 },
          { type: 'cruise', count: 2, delay: 3000 },
          { type: 'ballistic', count: 2, delay: 4500 },
        ],
        spawnInterval: 2000,
        description: 'מתקפה מלאה – הגן על כל הערים',
      },
    ],
  },
  {
    id: 'ch6',
    title: 'פרק 6: איום מלבנון',
    narrativeText: 'חיזבאללה מלבנון משגר רקטות וטילי שיוט לעבר הצפון. נהריה, חיפה ועכו במרכבת האש – רדאר צפוני וסוללות פטריוט חיוניים. התקציב ההתחלתי מאפשר פריסה טובה – ניצל אותו. מבוסס על איומי הצפון.',
    originKey: 'lebanon',
    startingBudget: 4000,
    waves: [
      {
        threats: [
          { type: 'rocket', count: 3, delay: 0 },
          { type: 'rocket', count: 2, delay: 2500 },
        ],
        spawnInterval: 4000,
        description: 'רקטות מלבנון לעבר הצפון',
        narrativeBetween: 'רקטות מלבנון יורטו. הגל הבא יכלול גם טיל שיוט – הכן פטריוט ובדוק כיסוי רדאר בצפון.',
      },
      {
        threats: [
          { type: 'rocket', count: 4, delay: 0 },
          { type: 'cruise', count: 1, delay: 3500 },
        ],
        spawnInterval: 3000,
        description: 'רקטות וטיל שיוט מלבנון',
        narrativeBetween: 'גל שני הושלם. הגל האחרון: רקטות, שיוט ומל"ט – גל מלא על ערי הצפון. החזק מעמד.',
      },
      {
        threats: [
          { type: 'rocket', count: 5, delay: 0 },
          { type: 'cruise', count: 2, delay: 2000 },
          { type: 'drone', count: 1, delay: 4500 },
        ],
        spawnInterval: 2400,
        description: 'גל מלא – הגן על ערי הצפון',
      },
    ],
  },
  {
    id: 'ch7',
    title: 'פרק 7: מבצע צוק איתן',
    narrativeText: 'מבצע צוק איתן – גל טילים מסיבי מעזה. רקטות קצרות טווח וטילי שיוט במקביל; כיפת ברזל ופטריוט תחת עומס. הפעל רדאר בדרום ומערב, פרוס סוללות בחכמה ונהל תחמושת – כל גל קשה מהקודם.',
    originKey: 'gaza',
    startingBudget: 4000,
    waves: [
      {
        threats: [
          { type: 'rocket', count: 4, delay: 0 },
          { type: 'rocket', count: 3, delay: 2000 },
        ],
        spawnInterval: 3500,
        description: 'גל רקטות מעזה',
        narrativeBetween: 'גל רקטות ראשון הושלם. האויב מוסיף טילי שיוט – בגל הבא תפגוש רקטות ושיוט במקביל. תגבר כיפת ברזל ופטריוט.',
      },
      {
        threats: [
          { type: 'rocket', count: 5, delay: 0 },
          { type: 'cruise', count: 1, delay: 3000 },
          { type: 'cruise', count: 1, delay: 5000 },
        ],
        spawnInterval: 2800,
        description: 'רקטות וטילי שיוט',
        narrativeBetween: 'גל שני הושלם. הגל האחרון: מתקפה מלאה מעזה – רקטות, שיוט ומל"טים. החזק מעמד והגן על הערים.',
      },
      {
        threats: [
          { type: 'rocket', count: 6, delay: 0 },
          { type: 'cruise', count: 2, delay: 2500 },
          { type: 'drone', count: 2, delay: 4000 },
        ],
        spawnInterval: 2200,
        description: 'מתקפה מלאה מעזה – החזק מעמד',
      },
    ],
  },
];

export function getStoryWaveConfig(chapterId: string, waveIndex: number): WaveConfig | null {
  const chapter = getChapters().find((c) => c.id === chapterId);
  if (!chapter || waveIndex < 0 || waveIndex >= chapter.waves.length) return null;
  const spec = chapter.waves[waveIndex];
  return {
    wave: waveIndex + 1,
    threats: spec.threats.map((t) => ({ ...t })),
    spawnInterval: spec.spawnInterval,
    description: spec.description ?? `גל ${waveIndex + 1}`,
  };
}

export function getStoryChapter(chapterId: string): StoryChapter | null {
  return getChapters().find((c) => c.id === chapterId) ?? null;
}

/** Returns list of chapters (cached or static). For admin/UI that needs the list. */
export function getStoryChaptersList(): StoryChapter[] {
  return getChapters();
}

/** Returns narrative to show between waves: after completing wave with 1-based number completedWave, before the next. */
export function getNarrativeBetweenWaves(chapterId: string | null, completedWave: number): string | null {
  if (!chapterId || completedWave < 1) return null;
  const chapter = getChapters().find((c) => c.id === chapterId);
  if (!chapter) return null;
  const waveIndex = completedWave - 1;
  if (waveIndex >= chapter.waves.length) return null;
  return chapter.waves[waveIndex].narrativeBetween ?? null;
}
