// Daily challenges – אתגרים יומיים (תבניות מ-Supabase או אתגרים ליום ספציפי, התקדמות ב-localStorage)

import { getGameConfig } from '@/lib/game/gameConfigLoader';
import { usePlayerStore } from '@/store/playerStore';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'sky_shield_daily_challenges';
const STORAGE_KEY_WEEKLY = 'sky_shield_weekly_challenges';

export interface DailyChallenge {
  id: string;
  type: 'intercept_any' | 'perfect_wave' | 'combo' | 'waves_completed';
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  /** Set when diamonds were awarded for this completion (avoid double reward) */
  rewardClaimed?: boolean;
  reward?: string;
  /** Diamonds awarded on completion (from template or DIAMONDS_PER_DAILY_CHALLENGE) */
  reward_diamonds?: number;
}

export function getDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** ISO week key for weekly challenges (e.g. 2025-W06) */
export function getWeekKey(): string {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

const CHALLENGE_TEMPLATES: Omit<DailyChallenge, 'progress' | 'completed'>[] = [
  { id: 'intercept', type: 'intercept_any', title: 'יירט איומים', description: 'יירט 8 איומים במשחק אחד', target: 8, reward: 'כוכב' },
  { id: 'intercept_15', type: 'intercept_any', title: 'יירט 15', description: 'יירט 15 איומים במשחק אחד', target: 15, reward: 'כוכב' },
  { id: 'perfect', type: 'perfect_wave', title: 'גל מושלם', description: 'השלם גל ללא נזק לעיר', target: 1, reward: 'כוכב' },
  { id: 'perfect_3', type: 'perfect_wave', title: 'שלושה גלים מושלמים', description: 'השלם 3 גלים ברצף ללא נזק לעיר', target: 3, reward: 'כוכב' },
  { id: 'combo', type: 'combo', title: 'קומבו', description: 'הגע לקומבו 10', target: 10, reward: 'כוכב' },
  { id: 'combo_15', type: 'combo', title: 'קומבו 15', description: 'הגע לקומבו 15', target: 15, reward: 'כוכב' },
  { id: 'waves', type: 'waves_completed', title: 'גלים', description: 'השלם 3 גלים במשחק אחד', target: 3, reward: 'כוכב' },
  { id: 'waves_5', type: 'waves_completed', title: 'חמישה גלים', description: 'השלם 5 גלים במשחק אחד', target: 5, reward: 'כוכב' },
  { id: 'waves_7', type: 'waves_completed', title: 'שבעה גלים', description: 'השלם 7 גלים במשחק אחד', target: 7, reward: 'כוכב' },
];

function seedFromDate(dateKey: string): number {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) h = (h << 5) - h + dateKey.charCodeAt(i);
  return Math.abs(h);
}

type TemplateRow = { id: string; type: string; title: string; description: string; target: number; reward: string | null; sort_order: number | null; reward_diamonds?: number };

/** Fetch today's challenge definitions from Supabase (override or templates), then merge with localStorage progress. */
export async function getDailyChallenges(): Promise<DailyChallenge[]> {
  const dateKey = getDateKey();
  let definitions: Omit<DailyChallenge, 'progress' | 'completed'>[] = [];

  try {
    const { data: overrideRow } = await supabase
      .from('daily_challenges_override')
      .select('challenges')
      .eq('date_key', dateKey)
      .maybeSingle();

    if (overrideRow?.challenges && Array.isArray(overrideRow.challenges)) {
      definitions = (overrideRow.challenges as unknown[]).map((c: unknown) => {
        const o = c as Record<string, unknown>;
        return {
          id: String(o.id ?? ''),
          type: (o.type as DailyChallenge['type']) ?? 'intercept_any',
          title: String(o.title ?? ''),
          description: String(o.description ?? ''),
          target: Number(o.target ?? 1),
          reward: o.reward != null ? String(o.reward) : 'כוכב',
          reward_diamonds: Number(o.reward_diamonds) || (getGameConfig().DIAMONDS_PER_DAILY_CHALLENGE ?? 3),
        };
      }).filter(t => t.id && t.type && t.target > 0);
    }

    if (definitions.length === 0) {
      const { data: templates } = await supabase
        .from('challenge_templates')
        .select('id, type, title, description, target, reward, sort_order, reward_diamonds')
        .eq('is_weekly', false)
        .order('sort_order', { ascending: true });
      if (templates && templates.length > 0) {
        const rng = seedFromDate(dateKey);
        const indices = templates.map((_, i) => i).sort(() => (rng % 2 === 0 ? 1 : -1));
        const pick = indices.slice(0, 3).map(i => templates[i] as TemplateRow);
        definitions = pick.map(t => ({
          id: t.id,
          type: t.type as DailyChallenge['type'],
          title: t.title,
          description: t.description,
          target: t.target,
          reward: t.reward ?? 'כוכב',
          reward_diamonds: t.reward_diamonds ?? (getGameConfig().DIAMONDS_PER_DAILY_CHALLENGE ?? 3),
        }));
      }
    }
  } catch {
    // fallback below
  }

  if (definitions.length === 0) {
    const rng = seedFromDate(dateKey);
    const indices = CHALLENGE_TEMPLATES.map((_, i) => i).sort(() => (rng % 2 === 0 ? 1 : -1));
    const fallback = indices.slice(0, 3).map(i => CHALLENGE_TEMPLATES[i]);
    definitions = fallback.map(t => ({ ...t, reward_diamonds: getGameConfig().DIAMONDS_PER_DAILY_CHALLENGE ?? 3 }));
  }

  const withProgress: DailyChallenge[] = definitions.map(t => ({
    ...t,
    progress: 0,
    completed: false,
  }));

  const stored = localStorage.getItem(STORAGE_KEY);
  let storedData: { date: string; challenges: DailyChallenge[] } | null = null;
  if (stored) {
    try {
      storedData = JSON.parse(stored);
    } catch {
      storedData = null;
    }
  }
  if (storedData && storedData.date === dateKey && Array.isArray(storedData.challenges)) {
    const byId = new Map(storedData.challenges.map(c => [c.id, c]));
    for (let i = 0; i < withProgress.length; i++) {
      const saved = byId.get(withProgress[i].id);
      if (saved) {
        withProgress[i] = {
          ...withProgress[i],
          progress: saved.progress,
          completed: saved.completed,
          rewardClaimed: saved.rewardClaimed,
        };
      }
    }
    const migrated = withProgress.map(c =>
      c.completed && c.rewardClaimed === undefined ? { ...c, rewardClaimed: true } : c
    );
    saveDailyChallenges(dateKey, migrated);
    return migrated;
  }

  saveDailyChallenges(dateKey, withProgress);
  return withProgress;
}

function saveDailyChallenges(dateKey: string, challenges: DailyChallenge[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: dateKey, challenges }));
  } catch {
    // ignore
  }
}

/** Update progress for today's challenges; call from game when stats change. Awards diamonds once per newly completed challenge. */
export async function updateDailyProgress(updates: {
  totalInterceptions?: number;
  perfectWaves?: number;
  maxCombo?: number;
  wavesCompleted?: number;
}): Promise<void> {
  const dateKey = getDateKey();
  const challenges = await getDailyChallenges();
  let changed = false;
  for (const c of challenges) {
    if (c.completed && c.rewardClaimed) continue;
    let progress = c.progress;
    if (c.type === 'intercept_any' && updates.totalInterceptions !== undefined) {
      progress = Math.min(c.target, updates.totalInterceptions);
    } else if (c.type === 'perfect_wave' && updates.perfectWaves !== undefined) {
      progress = Math.min(c.target, updates.perfectWaves);
    } else if (c.type === 'combo' && updates.maxCombo !== undefined) {
      progress = Math.min(c.target, updates.maxCombo);
    } else if (c.type === 'waves_completed' && updates.wavesCompleted !== undefined) {
      progress = Math.min(c.target, updates.wavesCompleted);
    }
    if (progress !== c.progress) {
      c.progress = progress;
      if (progress >= c.target) c.completed = true;
      changed = true;
    }
    // Award diamonds once per newly completed challenge (from template or default)
    if (c.completed && !c.rewardClaimed) {
      const amount = c.reward_diamonds ?? getGameConfig().DIAMONDS_PER_DAILY_CHALLENGE ?? 3;
      usePlayerStore.getState().addDiamonds(amount);
      c.rewardClaimed = true;
      changed = true;
    }
  }
  if (changed) saveDailyChallenges(dateKey, challenges);
}

// ——— Weekly challenges ——— אתגרים שבועיים (יעדים גבוהים יותר)

const WEEKLY_TEMPLATES: Omit<DailyChallenge, 'progress' | 'completed'>[] = [
  { id: 'weekly_intercept', type: 'intercept_any', title: 'יירט 25 (שבועי)', description: 'יירט 25 איומים במשחק אחד השבוע', target: 25, reward: 'כוכב' },
  { id: 'weekly_waves', type: 'waves_completed', title: '10 גלים (שבועי)', description: 'השלם 10 גלים במשחק אחד השבוע', target: 10, reward: 'כוכב' },
  { id: 'weekly_combo', type: 'combo', title: 'קומבו 20 (שבועי)', description: 'הגע לקומבו 20 השבוע', target: 20, reward: 'כוכב' },
  { id: 'weekly_perfect', type: 'perfect_wave', title: '5 גלים מושלמים (שבועי)', description: 'השלם 5 גלים ברצף ללא נזק השבוע', target: 5, reward: 'כוכב' },
];

/** Fetch this week's weekly challenges (override from Supabase or pick from templates). */
export async function getWeeklyChallenges(): Promise<DailyChallenge[]> {
  const weekKey = getWeekKey();
  let definitions: Omit<DailyChallenge, 'progress' | 'completed'>[] = [];

  try {
    const { data } = await supabase
      .from('daily_challenges_override')
      .select('challenges')
      .eq('date_key', `week_${weekKey}`)
      .maybeSingle();

    if (data?.challenges && Array.isArray(data.challenges)) {
      definitions = (data.challenges as unknown[]).map((c: unknown) => {
        const o = c as Record<string, unknown>;
        return {
          id: String(o.id ?? ''),
          type: (o.type as DailyChallenge['type']) ?? 'intercept_any',
          title: String(o.title ?? ''),
          description: String(o.description ?? ''),
          target: Number(o.target ?? 1),
          reward: o.reward != null ? String(o.reward) : 'כוכב',
          reward_diamonds: Number(o.reward_diamonds) || (getGameConfig().DIAMONDS_PER_DAILY_CHALLENGE ?? 3) + 1,
        };
      }).filter(t => t.id && t.type && t.target > 0);
    }
  } catch {
    // fallback
  }

  if (definitions.length === 0) {
    const { data: weeklyTemplates } = await supabase
      .from('challenge_templates')
      .select('id, type, title, description, target, reward, reward_diamonds')
      .eq('is_weekly', true)
      .order('sort_order', { ascending: true });
    if (weeklyTemplates && weeklyTemplates.length > 0) {
      const seed = seedFromDate(weekKey);
      const indices = weeklyTemplates.map((_, i) => i).sort(() => (seed % 2 === 0 ? 1 : -1));
      const pick = indices.slice(0, 2).map(i => weeklyTemplates[i] as TemplateRow);
      definitions = pick.map(t => ({
        id: t.id,
        type: t.type as DailyChallenge['type'],
        title: t.title,
        description: t.description,
        target: t.target,
        reward: t.reward ?? 'כוכב',
        reward_diamonds: t.reward_diamonds ?? (getGameConfig().DIAMONDS_PER_DAILY_CHALLENGE ?? 3) + 1,
      }));
    }
    if (definitions.length === 0) {
      const seed = seedFromDate(weekKey);
      const indices = WEEKLY_TEMPLATES.map((_, i) => i).sort(() => (seed % 2 === 0 ? 1 : -1));
      definitions = indices.slice(0, 2).map(i => ({
        ...WEEKLY_TEMPLATES[i],
        reward_diamonds: (getGameConfig().DIAMONDS_PER_DAILY_CHALLENGE ?? 3) + 1,
      }));
    }
  }

  const withProgress: DailyChallenge[] = definitions.map(t => ({
    ...t,
    progress: 0,
    completed: false,
  }));

  const stored = localStorage.getItem(STORAGE_KEY_WEEKLY);
  let storedData: { weekKey: string; challenges: DailyChallenge[] } | null = null;
  if (stored) {
    try {
      storedData = JSON.parse(stored);
    } catch {
      storedData = null;
    }
  }
  if (storedData && storedData.weekKey === weekKey && Array.isArray(storedData.challenges)) {
    const byId = new Map(storedData.challenges.map(c => [c.id, c]));
    for (let i = 0; i < withProgress.length; i++) {
      const saved = byId.get(withProgress[i].id);
      if (saved) {
        withProgress[i] = { ...withProgress[i], progress: saved.progress, completed: saved.completed, rewardClaimed: saved.rewardClaimed };
      }
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY_WEEKLY, JSON.stringify({ weekKey, challenges: withProgress }));
  } catch {
    // ignore
  }
  return withProgress;
}

/** Update weekly challenge progress; call from game. */
export async function updateWeeklyProgress(updates: {
  totalInterceptions?: number;
  perfectWaves?: number;
  maxCombo?: number;
  wavesCompleted?: number;
}): Promise<void> {
  const weekKey = getWeekKey();
  const challenges = await getWeeklyChallenges();
  let changed = false;
  for (const c of challenges) {
    if (c.completed && c.rewardClaimed) continue;
    let progress = c.progress;
    if (c.type === 'intercept_any' && updates.totalInterceptions !== undefined) {
      progress = Math.min(c.target, updates.totalInterceptions);
    } else if (c.type === 'perfect_wave' && updates.perfectWaves !== undefined) {
      progress = Math.min(c.target, updates.perfectWaves);
    } else if (c.type === 'combo' && updates.maxCombo !== undefined) {
      progress = Math.min(c.target, updates.maxCombo);
    } else if (c.type === 'waves_completed' && updates.wavesCompleted !== undefined) {
      progress = Math.min(c.target, updates.wavesCompleted);
    }
    if (progress !== c.progress) {
      c.progress = progress;
      if (progress >= c.target) c.completed = true;
      changed = true;
    }
    if (c.completed && !c.rewardClaimed) {
      const amount = c.reward_diamonds ?? (getGameConfig().DIAMONDS_PER_DAILY_CHALLENGE ?? 3) + 1;
      usePlayerStore.getState().addDiamonds(amount);
      c.rewardClaimed = true;
      changed = true;
    }
  }
  if (changed) {
    try {
      localStorage.setItem(STORAGE_KEY_WEEKLY, JSON.stringify({ weekKey, challenges }));
    } catch {
      // ignore
    }
  }
}
