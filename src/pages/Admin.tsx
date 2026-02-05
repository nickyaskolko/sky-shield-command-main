// Admin panel – דף אדמין (גישה רק למשתמשים מטבלת admin_users)

import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Users, Trophy, ArrowRight, Loader2, Plus, Trash2, Pencil, Calendar, Zap, UserX, BarChart3, Globe, Smartphone, BookOpen, Sparkles, ShoppingCart, CirclePlay, Activity } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';

const CHALLENGE_TYPES = ['intercept_any', 'perfect_wave', 'combo', 'waves_completed'] as const;
const ORIGIN_KEYS = ['gaza', 'lebanon', 'syria', 'iran', 'yemen', 'iraq'] as const;
const KNOWN_CONFIG_KEYS = [
  'LASER_UNLOCK_WAVE',
  'ENDLESS_MODE_START_WAVE',
  'SHORT_RANGE',
  'MEDIUM_RANGE',
  'LONG_RANGE',
  'LASER',
  'STORY_MODE_STARTING_BUDGET',
  'DIAMONDS_PER_DAILY_CHALLENGE',
  'DIAMOND_TO_BUDGET_RATIO',
  'INTERCEPT_MISS_FROM_WAVE',
  'INTERCEPT_MISS_CHANCE',
] as const;
/** מפתחות שהערך שלהם מספר בודד – להצגת שדה מספר */
const CONFIG_NUMBER_KEYS = ['LASER_UNLOCK_WAVE', 'ENDLESS_MODE_START_WAVE', 'STORY_MODE_STARTING_BUDGET', 'DIAMONDS_PER_DAILY_CHALLENGE', 'DIAMOND_TO_BUDGET_RATIO', 'INTERCEPT_MISS_FROM_WAVE'] as const;
/** מפתחות שהערך שלהם בוליאני (0/1 או true/false) */
const CONFIG_BOOLEAN_KEYS: string[] = [];

type ChallengeRow = { id: string; type: string; title: string; description: string; target: number; reward: string | null; sort_order: number | null; reward_diamonds?: number; is_weekly?: boolean };
type ChapterRow = { id: string; title: string; narrative_text: string; origin_key: string | null; starting_budget: number | null; waves: unknown; sort_order: number | null };
type ConfigRow = { key: string; value: unknown };
type OverrideRow = { date_key: string; challenges: unknown };
type ProfileRow = { id: string; display_name: string | null; stats: unknown; created_at: string; diamonds?: number; banned?: boolean; banned_reason?: string | null; banned_at?: string | null; banned_by?: string | null };
type BlockLogRow = { id: string; target_user_id: string; action: 'block' | 'unblock'; reason: string | null; admin_user_id: string | null; created_at: string };

const BLOCK_REASONS = [
  { value: 'terms', label: 'הפרת תנאי שימוש' },
  { value: 'fraud', label: 'הונאה / ניצול' },
  { value: 'harassment', label: 'הטרדה' },
  { value: 'user_request', label: 'בקשת משתמש' },
  { value: 'other', label: 'אחר (פרט בהערה)' },
] as const;

const ANALYTICS_PERIODS = [
  { value: 1, label: 'יומי (24 שעות)' },
  { value: 7, label: 'שבועי (7 ימים)' },
  { value: 30, label: 'חודשי (30 ימים)' },
  { value: 365, label: 'שנתי (12 חודשים)' },
] as const;

export default function Admin() {
  const { user, session, loading: authLoading } = useAuth();
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied'>('checking');
  const [stats, setStats] = useState<{ users: number | null; scores: number | null }>({ users: null, scores: null });
  const [challengeTemplates, setChallengeTemplates] = useState<ChallengeRow[]>([]);
  const [storyChapters, setStoryChapters] = useState<ChapterRow[]>([]);
  const [gameConfigRows, setGameConfigRows] = useState<ConfigRow[]>([]);
  const [overrideRows, setOverrideRows] = useState<OverrideRow[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingOverrides, setLoadingOverrides] = useState(false);

  // Challenge form (add/edit)
  const [challengeDialog, setChallengeDialog] = useState<'add' | 'edit' | null>(null);
  const [challengeEditId, setChallengeEditId] = useState<string | null>(null);
  const [challengeForm, setChallengeForm] = useState({ id: '', type: 'intercept_any', title: '', description: '', target: 1, reward: 'כוכב', sort_order: 0, reward_diamonds: 3, is_weekly: false });

  // Daily override form
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideDateKey, setOverrideDateKey] = useState('');
  const [overrideTemplateIds, setOverrideTemplateIds] = useState<string[]>([]);
  const [overrideYear, setOverrideYear] = useState(new Date().getFullYear());

  // Chapter form (add/edit)
  const [chapterDialog, setChapterDialog] = useState<'add' | 'edit' | null>(null);
  const [chapterEditId, setChapterEditId] = useState<string | null>(null);
  const [chapterForm, setChapterForm] = useState({ id: '', title: '', narrative_text: '', origin_key: '', starting_budget: '', wavesJson: '[]' });
  const [chapterFormError, setChapterFormError] = useState('');
  const [chapterAiDialogOpen, setChapterAiDialogOpen] = useState(false);

  // Config form (add/edit)
  const [configDialog, setConfigDialog] = useState<'add' | 'edit' | null>(null);
  const [configEditKey, setConfigEditKey] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState({ key: '', valueJson: 'null' });
  const [configFormError, setConfigFormError] = useState('');
  const [profilesList, setProfilesList] = useState<ProfileRow[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesLoadError, setProfilesLoadError] = useState<string | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [blockLogs, setBlockLogs] = useState<BlockLogRow[]>([]);
  const [loadingBlockLogs, setLoadingBlockLogs] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockTargetUser, setBlockTargetUser] = useState<{ id: string; display_name: string | null; banned: boolean } | null>(null);
  const [blockReasonKey, setBlockReasonKey] = useState<string>('terms');
  const [blockReasonOther, setBlockReasonOther] = useState('');
  
  // Analytics state
  const [analyticsStats, setAnalyticsStats] = useState<{
    totalVisits: number;
    uniqueVisitors: number;
    gamesStarted: number;
    topCountry: string;
    topCountryCount: number;
    authBlockedCount: number;
    storyStarts: number;
    storyChaptersCompleted: number;
    dailyRewardClaims: number;
    tutorialStarts: number;
    tutorialCompletes: number;
    tutorialSkips: number;
    savedGameContinues: number;
    resumeFails: number;
    shopOpens: number;
    purchasesCount: number;
    byCountry: Record<string, number>;
    byDevice: Record<string, number>;
  } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsDaysBack, setAnalyticsDaysBack] = useState<number>(7);
  const [activeNowCount, setActiveNowCount] = useState<number | null>(null);
  const [loadingActiveNow, setLoadingActiveNow] = useState(false);
  const godMode = usePlayerStore((s) => s.godMode);
  const setGodMode = usePlayerStore((s) => s.setGodMode);

  const loadChallenges = async () => {
    setLoadingChallenges(true);
    try {
      const { data } = await supabase.from('challenge_templates').select('*').order('sort_order', { ascending: true });
      setChallengeTemplates(data ?? []);
    } catch {
      setChallengeTemplates([]);
    } finally {
      setLoadingChallenges(false);
    }
  };
  const loadChapters = async () => {
    setLoadingChapters(true);
    try {
      const { data } = await supabase.from('story_chapters').select('*').order('sort_order', { ascending: true });
      setStoryChapters(data ?? []);
    } catch {
      setStoryChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  };
  const loadGameConfig = async () => {
    setLoadingConfig(true);
    try {
      const { data } = await supabase.from('game_config').select('key, value');
      setGameConfigRows(data ?? []);
    } catch {
      setGameConfigRows([]);
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadOverrides = async () => {
    setLoadingOverrides(true);
    try {
      const { data } = await supabase.from('daily_challenges_override').select('date_key, challenges').order('date_key', { ascending: false });
      setOverrideRows(data ?? []);
    } catch {
      setOverrideRows([]);
    } finally {
      setLoadingOverrides(false);
    }
  };

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    setProfilesLoadError(null);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) {
        setProfilesList([]);
        setProfilesLoadError(error.message || 'שגיאה בטעינת פרופילים');
      } else {
        setProfilesList((data ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          display_name: r.display_name as string | null,
          stats: r.stats,
          created_at: r.created_at as string,
          diamonds: (r.diamonds as number) ?? 0,
          banned: !!(r.banned as boolean),
          banned_reason: r.banned_reason as string | null,
          banned_at: r.banned_at as string | null,
          banned_by: r.banned_by as string | null,
        })));
      }
    } catch (e) {
      setProfilesList([]);
      setProfilesLoadError(e instanceof Error ? e.message : 'שגיאה בטעינת פרופילים');
    } finally {
      setLoadingProfiles(false);
    }
  };

  const loadBlockLogs = async () => {
    setLoadingBlockLogs(true);
    try {
      const { data } = await supabase.from('block_logs').select('id, target_user_id, action, reason, admin_user_id, created_at').order('created_at', { ascending: false }).limit(100);
      setBlockLogs((data ?? []) as BlockLogRow[]);
    } catch {
      setBlockLogs([]);
    } finally {
      setLoadingBlockLogs(false);
    }
  };

  const loadAnalytics = async (daysOverride?: number) => {
    setLoadingAnalytics(true);
    const days = daysOverride ?? analyticsDaysBack;
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    try {
      const { data: summary } = await supabase.rpc('get_analytics_summary', { days_back: days });
      
      const { data: countryData } = await supabase
        .from('analytics_events')
        .select('country')
        .eq('event_type', 'page_view')
        .not('country', 'is', null)
        .gte('created_at', fromDate);
      
      const byCountry: Record<string, number> = {};
      countryData?.forEach(row => {
        byCountry[row.country] = (byCountry[row.country] || 0) + 1;
      });
      
      const { data: deviceData } = await supabase
        .from('analytics_events')
        .select('device_type')
        .eq('event_type', 'page_view')
        .gte('created_at', fromDate);
      
      const byDevice: Record<string, number> = {};
      deviceData?.forEach(row => {
        const d = row.device_type || 'unknown';
        byDevice[d] = (byDevice[d] || 0) + 1;
      });
      
      const row = summary?.[0];
      setAnalyticsStats({
        totalVisits: Number(row?.total_visits) || 0,
        uniqueVisitors: Number(row?.unique_visitors) || 0,
        gamesStarted: Number(row?.games_started) || 0,
        topCountry: row?.top_country || 'לא ידוע',
        topCountryCount: Number(row?.top_country_count) || 0,
        authBlockedCount: Number(row?.auth_blocked_count) || 0,
        storyStarts: Number(row?.story_starts) || 0,
        storyChaptersCompleted: Number(row?.story_chapters_completed) || 0,
        dailyRewardClaims: Number(row?.daily_reward_claims) || 0,
        tutorialStarts: Number(row?.tutorial_starts) || 0,
        tutorialCompletes: Number(row?.tutorial_completes) || 0,
        tutorialSkips: Number(row?.tutorial_skips) || 0,
        savedGameContinues: Number(row?.saved_game_continues) || 0,
        resumeFails: Number(row?.resume_fails) || 0,
        shopOpens: Number(row?.shop_opens) || 0,
        purchasesCount: Number(row?.purchases_count) || 0,
        byCountry,
        byDevice,
      });
    } catch (err) {
      console.error('Analytics load error:', err);
      setAnalyticsStats(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadActiveNow = useCallback(async () => {
    setLoadingActiveNow(true);
    try {
      const { data, error } = await supabase.rpc('get_active_visitors_count', { minutes_back: 5 });
      if (error) {
        setActiveNowCount(null);
        return;
      }
      const raw = Array.isArray(data) ? data[0] : data;
      if (raw !== undefined && raw !== null) setActiveNowCount(Number(raw));
      else setActiveNowCount(null);
    } catch {
      setActiveNowCount(null);
    } finally {
      setLoadingActiveNow(false);
    }
  }, []);

  useEffect(() => {
    loadActiveNow();
    const t = setInterval(loadActiveNow, 45000);
    return () => clearInterval(t);
  }, [loadActiveNow]);

  const resetUserProfile = async (userId: string) => {
    setResettingUserId(userId);
    try {
      const defaultStats = { totalGamesPlayed: 0, totalInterceptions: 0, totalWavesCompleted: 0, highestWave: 0, highestScore: 0, highestCombo: 0, perfectWaves: 0, batteriesUsedTypes: [] };
      const { error } = await supabase.from('profiles').update({ stats: defaultStats, achievements: [], diamonds: 0 }).eq('id', userId);
      if (!error) await loadProfiles();
    } finally {
      setResettingUserId(null);
    }
  };

  const [grantingDonorId, setGrantingDonorId] = useState<string | null>(null);
  const [togglingBannedId, setTogglingBannedId] = useState<string | null>(null);
  const openBlockDialog = (p: ProfileRow) => {
    setBlockTargetUser({ id: p.id, display_name: p.display_name ?? null, banned: !!p.banned });
    setBlockReasonKey('terms');
    setBlockReasonOther('');
    setBlockDialogOpen(true);
  };
  const confirmBlockToggle = async () => {
    if (!blockTargetUser || !session?.user?.id) return;
    setTogglingBannedId(blockTargetUser.id);
    const newBanned = !blockTargetUser.banned;
    const reasonLabel = BLOCK_REASONS.find(r => r.value === blockReasonKey)?.label ?? blockReasonKey;
    const reasonText = blockReasonKey === 'other' ? blockReasonOther : reasonLabel;
    const payload: { banned: boolean; banned_reason?: string | null; banned_at?: string | null; banned_by?: string | null } = {
      banned: newBanned,
      banned_reason: newBanned ? reasonText || null : null,
      banned_at: newBanned ? new Date().toISOString() : null,
      banned_by: newBanned ? session.user.id : null,
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', blockTargetUser.id);
    if (!error) {
      await supabase.from('block_logs').insert({
        target_user_id: blockTargetUser.id,
        action: newBanned ? 'block' : 'unblock',
        reason: reasonText || null,
        admin_user_id: session.user.id,
      });
      await loadProfiles();
      await loadBlockLogs();
    }
    setBlockDialogOpen(false);
    setBlockTargetUser(null);
    setTogglingBannedId(null);
  };
  const grantDonorDiamonds = async (userId: string) => {
    setGrantingDonorId(userId);
    const { data: row } = await supabase.from('profiles').select('diamonds').eq('id', userId).single();
    const current = row?.diamonds ?? 0;
    const { error } = await supabase.from('profiles').update({ diamonds: current + 2000 }).eq('id', userId);
    if (!error) await loadProfiles();
    setGrantingDonorId(null);
  };

  useEffect(() => {
    if (!authLoading && !session) {
      setAccess('denied');
      return;
    }
    if (!session?.user?.id) return;

    (async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error || !data) {
        setAccess('denied');
        return;
      }
      setAccess('allowed');

      const [profilesRes, scoresRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('game_scores').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        users: profilesRes.error ? null : (profilesRes.count ?? 0),
        scores: scoresRes.error ? null : (scoresRes.count ?? 0),
      });
      loadChallenges();
      loadChapters();
      loadGameConfig();
      loadOverrides();
    })();
  }, [authLoading, session]);

  useEffect(() => {
    if (access === 'allowed') {
      loadProfiles();
      loadAnalytics();
      loadBlockLogs();
    }
  }, [access]);

  const openChallengeAdd = () => {
    setChallengeForm({ id: '', type: 'intercept_any', title: '', description: '', target: 1, reward: 'כוכב', sort_order: challengeTemplates.length, reward_diamonds: 3, is_weekly: false });
    setChallengeEditId(null);
    setChallengeDialog('add');
  };
  const openChallengeEdit = (t: ChallengeRow) => {
    setChallengeForm({
      id: t.id,
      type: t.type,
      title: t.title,
      description: t.description,
      target: t.target,
      reward: t.reward ?? 'כוכב',
      sort_order: t.sort_order ?? 0,
      reward_diamonds: t.reward_diamonds ?? 3,
      is_weekly: t.is_weekly ?? false,
    });
    setChallengeEditId(t.id);
    setChallengeDialog('edit');
  };
  const saveChallenge = async () => {
    const payload = {
      id: challengeForm.id,
      type: challengeForm.type,
      title: challengeForm.title,
      description: challengeForm.description,
      target: Number(challengeForm.target) || 1,
      reward: challengeForm.reward || 'כוכב',
      sort_order: Number(challengeForm.sort_order) || 0,
      reward_diamonds: Number(challengeForm.reward_diamonds) || 3,
      is_weekly: !!challengeForm.is_weekly,
    };
    if (challengeDialog === 'add') {
      await supabase.from('challenge_templates').insert(payload);
    } else {
      await supabase.from('challenge_templates').update({
        type: payload.type,
        title: payload.title,
        description: payload.description,
        target: payload.target,
        reward: payload.reward,
        sort_order: payload.sort_order,
        reward_diamonds: payload.reward_diamonds,
        is_weekly: payload.is_weekly,
      }).eq('id', challengeEditId!);
    }
    setChallengeDialog(null);
    loadChallenges();
  };

  const openOverrideDialog = () => {
    const today = new Date();
    setOverrideDateKey(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    setOverrideTemplateIds(challengeTemplates.slice(0, 3).map(t => t.id));
    setOverrideDialogOpen(true);
  };
  const saveOverride = async () => {
    const challenges = challengeTemplates
      .filter(t => overrideTemplateIds.includes(t.id))
      .map(t => ({
        id: t.id,
        type: t.type,
        title: t.title,
        description: t.description,
        target: t.target,
        reward: t.reward ?? 'כוכב',
        reward_diamonds: t.reward_diamonds ?? 3,
        is_weekly: t.is_weekly ?? false,
      }));
    await supabase.from('daily_challenges_override').upsert({ date_key: overrideDateKey, challenges }, { onConflict: 'date_key' });
    setOverrideDialogOpen(false);
    loadOverrides();
  };
  const deleteOverride = async (dateKey: string) => {
    await supabase.from('daily_challenges_override').delete().eq('date_key', dateKey);
    loadOverrides();
  };

  const openChapterAdd = () => {
    setChapterForm({ id: '', title: '', narrative_text: '', origin_key: '', starting_budget: '', wavesJson: '[]' });
    setChapterFormError('');
    setChapterEditId(null);
    setChapterDialog('add');
  };
  const openChapterEdit = (ch: ChapterRow) => {
    setChapterForm({
      id: ch.id,
      title: ch.title,
      narrative_text: ch.narrative_text,
      origin_key: ch.origin_key ?? '',
      starting_budget: ch.starting_budget != null ? String(ch.starting_budget) : '',
      wavesJson: JSON.stringify(ch.waves, null, 2),
    });
    setChapterFormError('');
    setChapterEditId(ch.id);
    setChapterDialog('edit');
  };
  const saveChapter = async () => {
    let waves: unknown;
    try {
      waves = JSON.parse(chapterForm.wavesJson);
      if (!Array.isArray(waves)) throw new Error('waves must be an array');
    } catch (e) {
      setChapterFormError('JSON לא תקין או שמערך גלים לא מערך');
      return;
    }
    const payload = {
      id: chapterForm.id,
      title: chapterForm.title,
      narrative_text: chapterForm.narrative_text,
      origin_key: chapterForm.origin_key || null,
      starting_budget: chapterForm.starting_budget ? Number(chapterForm.starting_budget) : null,
      waves,
      sort_order: storyChapters.length,
    };
    if (chapterDialog === 'add') {
      await supabase.from('story_chapters').insert(payload);
    } else {
      await supabase.from('story_chapters').update({
        title: payload.title,
        narrative_text: payload.narrative_text,
        origin_key: payload.origin_key,
        starting_budget: payload.starting_budget,
        waves: payload.waves,
      }).eq('id', chapterEditId!);
    }
    setChapterDialog(null);
    loadChapters();
  };

  const openConfigAdd = () => {
    setConfigForm({ key: '', valueJson: 'null' });
    setConfigFormError('');
    setConfigEditKey(null);
    setConfigDialog('add');
  };
  const openConfigEdit = (row: ConfigRow) => {
    setConfigForm({ key: row.key, valueJson: JSON.stringify(row.value, null, 2) });
    setConfigFormError('');
    setConfigEditKey(row.key);
    setConfigDialog('edit');
  };
  const saveConfig = async () => {
    let value: unknown;
    try {
      value = JSON.parse(configForm.valueJson);
    } catch {
      setConfigFormError('ערך לא JSON תקין');
      return;
    }
    if (configDialog === 'add') {
      await supabase.from('game_config').insert({ key: configForm.key, value });
    } else {
      await supabase.from('game_config').update({ value }).eq('key', configEditKey!);
    }
    setConfigDialog(null);
    loadGameConfig();
  };

  if (authLoading || access === 'checking') {
    return (
      <div className="min-h-screen bg-game-bg flex items-center justify-center" dir="rtl">
        <Loader2 className="h-10 w-10 animate-spin text-game-accent" />
      </div>
    );
  }

  if (access === 'denied') {
    return (
      <>
        <Navigate to="/" replace />
        <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center gap-6 p-6" dir="rtl">
          <p className="text-game-text text-lg">אין לך גישה לפאנל זה. יש להתחבר כמשתמש אדמין.</p>
          <Button asChild className="bg-game-accent hover:bg-game-accent/80 text-game-panel">
            <Link to="/">
              <ArrowRight className="h-4 w-4 ml-2" />
              חזרה לדף הבית
            </Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <div id="main-content" role="main" className="min-h-screen bg-game-bg text-game-text p-6" dir="rtl" aria-label="תוכן ראשי – פאנל אדמין">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-game-accent" />
          <h1 className="text-3xl font-bold text-game-accent">פאנל אדמין</h1>
        </div>
        <p className="text-game-text-dim mb-6">מחובר כ־{user?.email}</p>

        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-game-panel/60 border border-game-accent/20 mb-4">
            <TabsTrigger value="stats" className="data-[state=active]:bg-game-accent data-[state=active]:text-game-panel">סטטיסטיקות</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-game-accent data-[state=active]:text-game-panel">אנליטיקס</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-game-accent data-[state=active]:text-game-panel">משתמשים</TabsTrigger>
            <TabsTrigger value="challenges" className="data-[state=active]:bg-game-accent data-[state=active]:text-game-panel">אתגרים יומיים</TabsTrigger>
            <TabsTrigger value="chapters" className="data-[state=active]:bg-game-accent data-[state=active]:text-game-panel">פרקי סיפור</TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-game-accent data-[state=active]:text-game-panel">הגדרות משחק</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-4">
            <section className="bg-game-panel/60 border border-game-accent/30 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-game-accent mb-4">סטטיסטיקות</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-game-bg/40 rounded-lg">
                  <Users className="h-8 w-8 text-game-accent" />
                  <div>
                    <p className="text-game-text-dim text-sm">משתמשים (פרופילים)</p>
                    <p className="text-2xl font-bold text-game-text">{stats.users !== null ? stats.users.toLocaleString() : '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-game-bg/40 rounded-lg">
                  <Trophy className="h-8 w-8 text-game-accent" />
                  <div>
                    <p className="text-game-text-dim text-sm">ציוני משחק</p>
                    <p className="text-2xl font-bold text-game-text">{stats.scores !== null ? stats.scores.toLocaleString() : '—'}</p>
                  </div>
                </div>
              </div>
            </section>
            <section className="bg-game-panel/60 border border-game-accent/30 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-game-accent mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5" /> God Mode (אדמין)
              </h2>
              <p className="text-game-text-dim text-sm mb-3">כשמופעל – המורל לא יורד לאפס ולא נפסלים (משחק נצחי).</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={godMode}
                  onChange={(e) => setGodMode(e.target.checked)}
                  className="rounded border-game-accent/50 w-5 h-5"
                />
                <span className="text-game-text">God Mode מופעל</span>
              </label>
            </section>
            <section className="bg-game-panel/40 border border-game-accent/20 rounded-xl p-4">
              <h2 className="text-lg font-semibold text-game-accent mb-2">הנחיות</h2>
              <ul className="text-game-text-dim text-sm space-y-1 list-disc list-inside">
                <li>הוספת אדמין: SQL Editor – <code className="bg-game-bg/60 px-1 rounded">INSERT INTO public.admin_users (user_id) VALUES ('uuid');</code></li>
                <li>צפייה ברשימת אדמינים: SQL Editor – <code className="bg-game-bg/60 px-1 rounded">SELECT * FROM public.admin_users;</code> (מחזיר user_id של כל האדמינים)</li>
                <li>טבלאות: profiles, game_scores – docs/supabase-schema.sql</li>
                <li><strong className="text-game-text">הסבר &quot;דריסה&quot;:</strong> בטאבים אתגרים והגדרות – &quot;דריסה&quot; = החלפת ברירת המחדל: אתגרים ליום ספציפי (במקום אקראי), או ערך הגדרה מהמסד (במקום מקוד).</li>
              </ul>
            </section>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <section className="bg-game-panel/60 border border-game-accent/30 rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-semibold text-game-accent flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> אנליטיקס
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={String(analyticsDaysBack)} onValueChange={(v) => { const d = Number(v); setAnalyticsDaysBack(d); loadAnalytics(d); }}>
                    <SelectTrigger className="w-[180px] bg-game-bg/60 border-game-accent/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANALYTICS_PERIODS.map((p) => (
                        <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={loadAnalytics} disabled={loadingAnalytics} variant="outline" className="border-game-accent/50">
                    {loadingAnalytics ? <Loader2 className="h-4 w-4 animate-spin" /> : 'רענן'}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-game-bg/30 rounded-lg border border-game-accent/20">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  <span className="text-game-text font-medium">משתמשים אונליין עכשיו (5 דקות אחרונות):</span>
                  {loadingActiveNow ? (
                    <Loader2 className="h-4 w-4 animate-spin text-game-accent" />
                  ) : (
                    <span className="text-xl font-bold text-game-accent">{activeNowCount !== null ? activeNowCount.toLocaleString() : '—'}</span>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={loadActiveNow} disabled={loadingActiveNow} className="text-game-text-dim">
                  רענן
                </Button>
              </div>
              
              {!analyticsStats && !loadingAnalytics && (
                <p className="text-game-text-dim text-sm">אין נתונים עדיין. ודא שהטבלה analytics_events קיימת ב-Supabase.</p>
              )}
              
              {analyticsStats && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-game-bg/40 rounded-lg text-center">
                      <p className="text-game-text-dim text-sm">צפיות</p>
                      <p className="text-2xl font-bold text-game-accent">{analyticsStats.totalVisits.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-game-bg/40 rounded-lg text-center">
                      <p className="text-game-text-dim text-sm">מבקרים ייחודיים</p>
                      <p className="text-2xl font-bold text-game-accent">{analyticsStats.uniqueVisitors.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-game-bg/40 rounded-lg text-center">
                      <p className="text-game-text-dim text-sm">משחקים שהתחילו</p>
                      <p className="text-2xl font-bold text-game-accent">{analyticsStats.gamesStarted.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-game-bg/40 rounded-lg text-center">
                      <p className="text-game-text-dim text-sm">מדינה מובילה</p>
                      <p className="text-lg font-bold text-game-accent">{analyticsStats.topCountry}</p>
                      <p className="text-xs text-game-text-dim">({analyticsStats.topCountryCount.toLocaleString()} צפיות)</p>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-game-accent mb-2 mt-6">מדדים נוספים</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                    <div className="p-3 bg-game-bg/40 rounded-lg text-center flex flex-col items-center gap-1">
                      <UserX className="h-4 w-4 text-game-text-dim" />
                      <p className="text-game-text-dim text-xs">חסימת אימות</p>
                      <p className="text-lg font-bold text-game-accent">{analyticsStats.authBlockedCount.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-game-bg/40 rounded-lg text-center flex flex-col items-center gap-1">
                      <BookOpen className="h-4 w-4 text-game-text-dim" />
                      <p className="text-game-text-dim text-xs">התחלות סיפור</p>
                      <p className="text-lg font-bold text-game-accent">{analyticsStats.storyStarts.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-game-bg/40 rounded-lg text-center flex flex-col items-center gap-1">
                      <BookOpen className="h-4 w-4 text-game-text-dim" />
                      <p className="text-game-text-dim text-xs">פרקים שהושלמו</p>
                      <p className="text-lg font-bold text-game-accent">{analyticsStats.storyChaptersCompleted.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-game-bg/40 rounded-lg text-center flex flex-col items-center gap-1">
                      <Sparkles className="h-4 w-4 text-game-text-dim" />
                      <p className="text-game-text-dim text-xs">תגמול יומי</p>
                      <p className="text-lg font-bold text-game-accent">{analyticsStats.dailyRewardClaims.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-game-bg/40 rounded-lg text-center flex flex-col items-center gap-1">
                      <CirclePlay className="h-4 w-4 text-game-text-dim" />
                      <p className="text-game-text-dim text-xs">התחלות הדרכה</p>
                      <p className="text-lg font-bold text-game-accent">{analyticsStats.tutorialStarts.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-game-bg/40 rounded-lg text-center flex flex-col items-center gap-1">
                      <CirclePlay className="h-4 w-4 text-game-text-dim" />
                      <p className="text-game-text-dim text-xs">הדרכה הושלמה</p>
                      <p className="text-lg font-bold text-game-accent">{analyticsStats.tutorialCompletes.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-game-bg/40 rounded-lg text-center flex flex-col items-center gap-1">
                      <CirclePlay className="h-4 w-4 text-game-text-dim" />
                      <p className="text-game-text-dim text-xs">דילוג הדרכה</p>
                      <p className="text-lg font-bold text-game-accent">{analyticsStats.tutorialSkips.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-game-bg/40 rounded-lg text-center flex flex-col items-center gap-1">
                      <Zap className="h-4 w-4 text-game-text-dim" />
                      <p className="text-game-text-dim text-xs">המשך משחק שמור</p>
                      <p className="text-lg font-bold text-game-accent">{analyticsStats.savedGameContinues.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-game-bg/40 rounded-lg text-center flex flex-col items-center gap-1">
                      <Zap className="h-4 w-4 text-game-text-dim" />
                      <p className="text-game-text-dim text-xs">כשלון המשך</p>
                      <p className="text-lg font-bold text-game-accent">{analyticsStats.resumeFails.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-game-bg/40 rounded-lg text-center flex flex-col items-center gap-1">
                      <ShoppingCart className="h-4 w-4 text-game-text-dim" />
                      <p className="text-game-text-dim text-xs">פתיחות חנות</p>
                      <p className="text-lg font-bold text-game-accent">{analyticsStats.shopOpens.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-game-bg/40 rounded-lg text-center flex flex-col items-center gap-1">
                      <ShoppingCart className="h-4 w-4 text-game-text-dim" />
                      <p className="text-game-text-dim text-xs">רכישות</p>
                      <p className="text-lg font-bold text-game-accent">{analyticsStats.purchasesCount.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-game-accent mb-2 flex items-center gap-2">
                        <Globe className="h-4 w-4" /> לפי מדינה
                      </h3>
                      {Object.keys(analyticsStats.byCountry).length === 0 ? (
                        <p className="text-game-text-dim text-sm">אין נתונים</p>
                      ) : (
                        <ul className="space-y-1 text-sm max-h-48 overflow-y-auto">
                          {Object.entries(analyticsStats.byCountry)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([country, count]) => (
                              <li key={country} className="flex justify-between p-2 bg-game-bg/30 rounded">
                                <span>{country}</span>
                                <span className="text-game-accent font-medium">{count}</span>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-game-accent mb-2 flex items-center gap-2">
                        <Smartphone className="h-4 w-4" /> לפי מכשיר
                      </h3>
                      {Object.keys(analyticsStats.byDevice).length === 0 ? (
                        <p className="text-game-text-dim text-sm">אין נתונים</p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {Object.entries(analyticsStats.byDevice)
                            .sort((a, b) => b[1] - a[1])
                            .map(([device, count]) => (
                              <li key={device} className="flex justify-between p-2 bg-game-bg/30 rounded">
                                <span>{device === 'mobile' ? 'מובייל' : device === 'desktop' ? 'מחשב' : device === 'tablet' ? 'טאבלט' : device}</span>
                                <span className="text-game-accent font-medium">{count}</span>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              )}
            </section>
            <section className="bg-game-panel/40 border border-game-accent/20 rounded-xl p-4">
              <h2 className="text-lg font-semibold text-game-accent mb-2">אירועים נתמכים</h2>
              <ul className="text-game-text-dim text-sm space-y-1 list-disc list-inside columns-1 sm:columns-2">
                <li><code className="bg-game-bg/60 px-1 rounded">page_view</code> – צפייה בדף</li>
                <li><code className="bg-game-bg/60 px-1 rounded">game_start</code> – התחלת משחק</li>
                <li><code className="bg-game-bg/60 px-1 rounded">wave_complete</code> – סיום גל</li>
                <li><code className="bg-game-bg/60 px-1 rounded">game_over</code> – סיום משחק</li>
                <li><code className="bg-game-bg/60 px-1 rounded">auth_blocked</code> – חסימת אימות</li>
                <li><code className="bg-game-bg/60 px-1 rounded">story_start</code> – התחלת סיפור</li>
                <li><code className="bg-game-bg/60 px-1 rounded">story_chapter_complete</code> – סיום פרק</li>
                <li><code className="bg-game-bg/60 px-1 rounded">daily_reward_claim</code> – תביעת תגמול יומי</li>
                <li><code className="bg-game-bg/60 px-1 rounded">tutorial_start</code> – התחלת הדרכה</li>
                <li><code className="bg-game-bg/60 px-1 rounded">tutorial_complete</code> – סיום הדרכה</li>
                <li><code className="bg-game-bg/60 px-1 rounded">tutorial_skip</code> – דילוג הדרכה</li>
                <li><code className="bg-game-bg/60 px-1 rounded">saved_game_continue</code> – המשך משחק שמור</li>
                <li><code className="bg-game-bg/60 px-1 rounded">resume_fail</code> – כשלון המשך</li>
                <li><code className="bg-game-bg/60 px-1 rounded">shop_open</code> – פתיחת חנות</li>
                <li><code className="bg-game-bg/60 px-1 rounded">purchase</code> – רכישה</li>
              </ul>
            </section>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <section className="bg-game-panel/60 border border-game-accent/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-game-accent flex items-center gap-2">
                  <UserX className="h-5 w-5" /> משתמשים רשומים
                </h2>
                <Button size="sm" onClick={loadProfiles} disabled={loadingProfiles} variant="outline" className="border-game-accent/50">
                  {loadingProfiles ? <Loader2 className="h-4 w-4 animate-spin" /> : 'רענן'}
                </Button>
              </div>
              <p className="text-game-text-dim text-xs mb-3">איפוס מאפס סטטיסטיקות, הישגים ויהלומים. הענק תורם = +2000 יהלומים (אחרי אימות תרומה).</p>
              {profilesLoadError && (
                <p className="text-red-400 text-sm mb-2">שגיאה: {profilesLoadError}. ודא שהמיגרציה admin_users + profiles_select_admin הורצה (אדמין רואה את כל הפרופילים).</p>
              )}
              {profilesList.length === 0 && !loadingProfiles && !profilesLoadError && (
                <p className="text-game-text-dim text-sm">אין פרופילים או שאין הרשאה לצפייה.</p>
              )}
              <ul className="space-y-2">
                {profilesList.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-game-bg/40 rounded-lg text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{p.display_name ?? p.id.slice(0, 8)}</span>
                      {p.banned && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/30 text-red-300" title={p.banned_reason ?? undefined}>
                          חסום{p.banned_reason ? `: ${p.banned_reason}` : ''}
                        </span>
                      )}
                      <span className="text-game-text-dim text-xs">({p.id.slice(0, 8)}…)</span>
                      {p.stats && typeof p.stats === 'object' && 'highestScore' in p.stats && (
                        <span className="text-game-text-dim text-xs">ציון: {(p.stats as { highestScore?: number }).highestScore ?? 0}</span>
                      )}
                      <span className="text-amber-300 text-xs font-mono">◆{p.diamonds ?? 0}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className={p.banned ? "text-green-400 border-green-500/50" : "text-orange-400 border-orange-500/50"}
                        disabled={togglingBannedId === p.id}
                        onClick={() => openBlockDialog(p)}
                        title={p.banned ? "בטל חסימת גישה" : "חסום גישה לאתר – בחר סיבה"}
                        aria-label={p.banned ? "בטל חסימת גישה" : "חסום גישה"}
                      >
                        {togglingBannedId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (p.banned ? 'בטל חסימה' : 'חסום גישה')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-amber-400 border-amber-500/50"
                        disabled={grantingDonorId === p.id}
                        onClick={() => grantDonorDiamonds(p.id)}
                        title="לאחר אימות תרומה – מעניק 2000 יהלומים"
                      >
                        {grantingDonorId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'הענק 2000 (תורם)'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400 border-red-500/50"
                        disabled={resettingUserId === p.id}
                        onClick={() => resetUserProfile(p.id)}
                      >
                        {resettingUserId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'איפוס משתמש'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* דיאלוג חסימה / ביטול – בחירת סיבה */}
              <Dialog open={blockDialogOpen} onOpenChange={(open) => !open && setBlockDialogOpen(false)}>
                <DialogContent className="bg-game-panel border-game-accent/30 text-game-text max-w-md" dir="rtl" aria-describedby="block-dialog-desc">
                  <DialogHeader>
                    <DialogTitle>{blockTargetUser?.banned ? 'ביטול חסימת גישה' : 'חסימת גישה לאתר'}</DialogTitle>
                    <DialogDescription id="block-dialog-desc">
                      {blockTargetUser?.banned
                        ? `מבטל חסימה למשתמש ${blockTargetUser.display_name ?? blockTargetUser.id.slice(0, 8)}.`
                        : `חסימת ${blockTargetUser?.display_name ?? blockTargetUser?.id.slice(0, 8)}. נא לבחור סיבה (נרשם בלוג).`}
                    </DialogDescription>
                  </DialogHeader>
                  {!blockTargetUser?.banned && (
                    <div className="grid gap-3 py-2">
                      <Label className="text-game-text-dim">סיבת חסימה</Label>
                      <Select value={blockReasonKey} onValueChange={setBlockReasonKey}>
                        <SelectTrigger className="bg-game-bg/60 border-game-accent/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BLOCK_REASONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {blockReasonKey === 'other' && (
                        <Input
                          placeholder="פרט את הסיבה"
                          value={blockReasonOther}
                          onChange={(e) => setBlockReasonOther(e.target.value)}
                          className="bg-game-bg/60 border-game-accent/20"
                          aria-label="סיבת חסימה אחר"
                        />
                      )}
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBlockDialogOpen(false)} className="border-game-accent/50">ביטול</Button>
                    <Button onClick={confirmBlockToggle} className="bg-game-accent text-game-panel" disabled={togglingBannedId !== null}>
                      {blockTargetUser?.banned ? 'בטל חסימה' : 'אשר חסימה'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* לוג חסימות */}
              <section className="bg-game-panel/60 border border-game-accent/30 rounded-xl p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-game-accent flex items-center gap-2">לוג חסימות</h2>
                  <Button size="sm" onClick={loadBlockLogs} disabled={loadingBlockLogs} variant="outline" className="border-game-accent/50">
                    {loadingBlockLogs ? <Loader2 className="h-4 w-4 animate-spin" /> : 'רענן'}
                  </Button>
                </div>
                <p className="text-game-text-dim text-xs mb-3">רישום אחרון של חסימות וביטולי חסימה (עד 100 רשומות).</p>
                {blockLogs.length === 0 && !loadingBlockLogs && <p className="text-game-text-dim text-sm">אין רשומות.</p>}
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {blockLogs.map((log) => (
                    <li key={log.id} className="flex flex-wrap items-center gap-2 p-2 bg-game-bg/40 rounded text-xs">
                      <span className="text-game-text-dim">{new Date(log.created_at).toLocaleString('he-IL')}</span>
                      <span className={log.action === 'block' ? 'text-red-400' : 'text-green-400'}>{log.action === 'block' ? 'חסימה' : 'ביטול חסימה'}</span>
                      <span>משתמש: {log.target_user_id.slice(0, 8)}…</span>
                      {log.reason && <span className="text-game-text-dim">סיבה: {log.reason}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            </section>
          </TabsContent>

          <TabsContent value="challenges" className="space-y-4">
            <p className="text-game-text-dim text-sm mb-2">ניהול תבניות אתגרים יומיים ואתגרים ליום ספציפי. הוסף תבנית → ערוך/מחק. &quot;אתגרים ליום ספציפי&quot; = בחר תאריך ו־3 אתגרים שיופיעו רק באותו יום (במקום בחירה אקראית מתבניות).</p>
            <section className="bg-game-panel/60 border border-game-accent/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-game-accent flex items-center gap-2">
                  <Trophy className="h-5 w-5" /> תבניות אתגרים יומיים
                </h2>
                <div className="flex gap-2">
                  <Button size="sm" onClick={openChallengeAdd} className="bg-game-accent text-game-panel">
                    <Plus className="h-4 w-4 ml-1" /> הוסף תבנית
                  </Button>
                  <Button size="sm" onClick={() => loadChallenges()} disabled={loadingChallenges} variant="outline" className="border-game-accent/50">
                    {loadingChallenges ? <Loader2 className="h-4 w-4 animate-spin" /> : 'רענן'}
                  </Button>
                </div>
              </div>
              {challengeTemplates.length === 0 && !loadingChallenges && (
                <p className="text-game-text-dim text-sm mb-4">אין תבניות. הוסף תבנית (הוסף תבנית) או הרץ את מיגרציית Supabase.</p>
              )}
              <ul className="space-y-2 mb-4">
                {challengeTemplates.map((t) => (
                  <li key={t.id} className="flex items-center justify-between p-3 bg-game-bg/40 rounded-lg text-sm">
                    <span><strong>{t.title}</strong> – {t.type}, יעד: {t.target}{t.reward_diamonds != null ? `, ◆${t.reward_diamonds}` : ''}{t.is_weekly ? ' (שבועי)' : ''}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-game-accent/50" onClick={() => openChallengeEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-400 border-red-400/50" onClick={async () => {
                        await supabase.from('challenge_templates').delete().eq('id', t.id);
                        loadChallenges();
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <section className="bg-game-panel/60 border border-game-accent/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-game-accent flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> אתגרים ליום ספציפי
                </h2>
                <div className="flex gap-2">
                  <Button size="sm" onClick={openOverrideDialog} className="bg-game-accent text-game-panel">
                    <Plus className="h-4 w-4 ml-1" /> הוסף יום ספציפי
                  </Button>
                  <Button size="sm" onClick={loadOverrides} disabled={loadingOverrides} variant="outline" className="border-game-accent/50">
                    {loadingOverrides ? <Loader2 className="h-4 w-4 animate-spin" /> : 'רענן'}
                  </Button>
                </div>
              </div>
              <p className="text-game-text-dim text-xs mb-3">הגדר אתגרים קבועים ליום (YYYY-MM-DD). ביום כזה השחקן יראה את 3 האתגרים שבחרת במקום בחירה אקראית מתבניות.</p>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Label className="text-game-text-dim text-xs">תאריכים מיוחדים / חגים (שנה:</Label>
                <input
                  type="number"
                  min={2024}
                  max={2030}
                  value={overrideYear}
                  onChange={(e) => setOverrideYear(Number(e.target.value) || new Date().getFullYear())}
                  className="w-16 rounded border border-game-accent/30 bg-game-bg/60 px-2 py-1 text-sm text-game-text"
                />
                <span className="text-game-text-dim text-xs">):</span>
                {[
                  { label: 'ראש השנה', month: 9, day: 23 },
                  { label: 'יום כיפור', month: 10, day: 2 },
                  { label: 'סוכות', month: 10, day: 7 },
                  { label: 'חנוכה', month: 12, day: 25 },
                  { label: 'פורים', month: 3, day: 14 },
                  { label: 'פסח', month: 4, day: 23 },
                  { label: 'יום העצמאות', month: 4, day: 30 },
                ].map(({ label, month, day }) => (
                  <Button
                    key={label}
                    size="sm"
                    variant="outline"
                    className="border-amber-500/50 text-amber-200 text-xs"
                    onClick={() => {
                      setOverrideDateKey(`${overrideYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
                      setOverrideDialogOpen(true);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {overrideRows.length === 0 && !loadingOverrides && (
                <p className="text-game-text-dim text-sm">אין ימים עם אתגרים ספציפיים.</p>
              )}
              <ul className="space-y-2">
                {overrideRows.map((row) => (
                  <li key={row.date_key} className="flex items-center justify-between p-3 bg-game-bg/40 rounded-lg text-sm">
                    <span>{row.date_key} – {Array.isArray(row.challenges) ? row.challenges.length : 0} אתגרים</span>
                    <Button size="sm" variant="outline" className="text-red-400 border-red-400/50" onClick={() => deleteOverride(row.date_key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>

            <Dialog open={challengeDialog !== null} onOpenChange={(open) => !open && setChallengeDialog(null)}>
              <DialogContent className="bg-game-panel border-game-accent/30 text-game-text max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>{challengeDialog === 'add' ? 'הוסף תבנית אתגר' : 'ערוך תבנית'}</DialogTitle>
                  <DialogDescription>שדות תואמים לטבלת challenge_templates.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div>
                    <Label className="text-game-text-dim">id</Label>
                    <Input
                      value={challengeForm.id}
                      onChange={(e) => setChallengeForm(f => ({ ...f, id: e.target.value }))}
                      placeholder="intercept"
                      className="bg-game-bg/60 border-game-accent/20"
                      disabled={challengeDialog === 'edit'}
                    />
                  </div>
                  <div>
                    <Label className="text-game-text-dim">סוג (type)</Label>
                    <p className="text-game-text-dim text-xs mb-1">intercept_any | perfect_wave | combo | waves_completed</p>
                    <Select value={challengeForm.type} onValueChange={(v) => setChallengeForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="bg-game-bg/60 border-game-accent/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHALLENGE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-game-text-dim">כותרת</Label>
                    <Input
                      value={challengeForm.title}
                      onChange={(e) => setChallengeForm(f => ({ ...f, title: e.target.value }))}
                      className="bg-game-bg/60 border-game-accent/20"
                    />
                  </div>
                  <div>
                    <Label className="text-game-text-dim">תיאור</Label>
                    <Input
                      value={challengeForm.description}
                      onChange={(e) => setChallengeForm(f => ({ ...f, description: e.target.value }))}
                      className="bg-game-bg/60 border-game-accent/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-game-text-dim">יעד (target)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={challengeForm.target}
                        onChange={(e) => setChallengeForm(f => ({ ...f, target: Number(e.target.value) || 1 }))}
                        className="bg-game-bg/60 border-game-accent/20"
                      />
                    </div>
                    <div>
                      <Label className="text-game-text-dim">פרס (reward)</Label>
                      <Input
                        value={challengeForm.reward}
                        onChange={(e) => setChallengeForm(f => ({ ...f, reward: e.target.value }))}
                        className="bg-game-bg/60 border-game-accent/20"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-game-text-dim">יהלומים לפרס</Label>
                      <Input
                        type="number"
                        min={0}
                        value={challengeForm.reward_diamonds}
                        onChange={(e) => setChallengeForm(f => ({ ...f, reward_diamonds: Number(e.target.value) || 0 }))}
                        className="bg-game-bg/60 border-game-accent/20"
                      />
                      <p className="text-game-text-dim text-xs mt-0.5">כמות יהלומים כשמשלימים את האתגר (התאמה למחירים בחנות)</p>
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={challengeForm.is_weekly}
                          onChange={(e) => setChallengeForm(f => ({ ...f, is_weekly: e.target.checked }))}
                          className="rounded border-game-accent/30"
                        />
                        <span className="text-sm text-game-text">אתגר שבועי</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <Label className="text-game-text-dim">סדר (sort_order)</Label>
                    <Input
                      type="number"
                      value={challengeForm.sort_order}
                      onChange={(e) => setChallengeForm(f => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
                      className="bg-game-bg/60 border-game-accent/20"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setChallengeDialog(null)} className="border-game-accent/50">ביטול</Button>
                  <Button onClick={saveChallenge} className="bg-game-accent text-game-panel">שמירה</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
              <DialogContent className="bg-game-panel border-game-accent/30 text-game-text max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>אתגרים ליום ספציפי</DialogTitle>
                  <DialogDescription>בחר תאריך (YYYY-MM-DD) ואת 3 התבניות שיופיעו באותו יום במקום אקראי.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div>
                    <Label className="text-game-text-dim">תאריך (date_key)</Label>
                    <Input
                      type="date"
                      value={overrideDateKey}
                      onChange={(e) => setOverrideDateKey(e.target.value)}
                      className="bg-game-bg/60 border-game-accent/20"
                    />
                  </div>
                  <div>
                    <Label className="text-game-text-dim">תבניות (בחר עד 3)</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {challengeTemplates.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={overrideTemplateIds.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setOverrideTemplateIds(ids => ids.length < 3 ? [...ids, t.id] : ids);
                              } else {
                                setOverrideTemplateIds(ids => ids.filter(id => id !== t.id));
                              }
                            }}
                            className="rounded border-game-accent/30"
                          />
                          <span className="text-sm">{t.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOverrideDialogOpen(false)} className="border-game-accent/50">ביטול</Button>
                  <Button onClick={saveOverride} className="bg-game-accent text-game-panel">שמירה</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="chapters" className="space-y-4">
            <p className="text-game-text-dim text-sm mb-2">ניהול פרקי מצב סיפור. לכל פרק: כותרת, תיאור (עלילה), מקור איומים (עזה/לבנון/…), תקציב התחלתי, וכמות גלים (מערך JSON – כל גל: threats, spawnInterval, description).</p>
            <section className="bg-game-panel/60 border border-game-accent/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-game-accent flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> פרקי סיפור
                </h2>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={openChapterAdd} className="bg-game-accent text-game-panel">
                    <Plus className="h-4 w-4 ml-1" /> הוסף פרק
                  </Button>
                  <Button size="sm" onClick={() => setChapterAiDialogOpen(true)} variant="outline" className="border-amber-500/50 text-amber-200">
                    <Sparkles className="h-4 w-4 ml-1" /> יצירה עם AI
                  </Button>
                  <Button size="sm" onClick={() => loadChapters()} disabled={loadingChapters} variant="outline" className="border-game-accent/50">
                    {loadingChapters ? <Loader2 className="h-4 w-4 animate-spin" /> : 'רענן'}
                  </Button>
                </div>
              </div>
              {storyChapters.length === 0 && !loadingChapters && (
                <p className="text-game-text-dim text-sm mb-4">אין פרקים. הוסף פרק או הרץ מיגרציית Supabase.</p>
              )}

              {/* דיאלוג יצירה עם AI – placeholder עד לחיבור API */}
              <Dialog open={chapterAiDialogOpen} onOpenChange={setChapterAiDialogOpen}>
                <DialogContent className="bg-game-panel border-game-accent/30 text-game-text max-w-md" dir="rtl" aria-labelledby="ai-dialog-title" aria-describedby="ai-dialog-desc">
                  <DialogHeader>
                    <DialogTitle id="ai-dialog-title">יצירת פרק סיפור עם AI</DialogTitle>
                    <DialogDescription id="ai-dialog-desc">
                      בעתיד: הזנת כותרת/תיאור קצר ו־AI ייצר פרק (כותרת, עלילה, גלים). נדרש חיבור ל־API (OpenAI/אחר).
                    </DialogDescription>
                  </DialogHeader>
                  <p className="text-game-text-dim text-sm py-2">הפיצ'ר בשלבי פיתוח. בינתיים השתמש ב&quot;הוסף פרק&quot; וערוך ידנית.</p>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setChapterAiDialogOpen(false)} className="border-game-accent/50">סגור</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <ul className="space-y-2">
                {storyChapters.map((ch) => (
                  <li key={ch.id} className="flex items-center justify-between p-3 bg-game-bg/40 rounded-lg text-sm">
                    <span><strong>{ch.title}</strong> (id: {ch.id}, גלים: {Array.isArray(ch.waves) ? ch.waves.length : 0})</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-game-accent/50" onClick={() => openChapterEdit(ch)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-400 border-red-400/50" onClick={async () => {
                        await supabase.from('story_chapters').delete().eq('id', ch.id);
                        loadChapters();
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-game-text-dim text-xs mt-4">waves = JSON מערך של {`{ threats: [{ type, count, delay }], spawnInterval, description }`}.</p>
            </section>

            <Dialog open={chapterDialog !== null} onOpenChange={(open) => !open && setChapterDialog(null)}>
              <DialogContent className="bg-game-panel border-game-accent/30 text-game-text max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                  <DialogTitle>{chapterDialog === 'add' ? 'הוסף פרק סיפור' : 'ערוך פרק'}</DialogTitle>
                  <DialogDescription>כותרת, תיאור, מקור איומים, תקציב, גלים (JSON). אפשר להדביק תבנית גלים או לערוך ידנית.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div>
                    <Label className="text-game-text-dim">מזהה (id) – לא ניתן לעריכה אחרי שמירה</Label>
                    <Input
                      value={chapterForm.id}
                      onChange={(e) => setChapterForm(f => ({ ...f, id: e.target.value }))}
                      placeholder="ch1"
                      className="bg-game-bg/60 border-game-accent/20"
                      disabled={chapterDialog === 'edit'}
                    />
                  </div>
                  <div>
                    <Label className="text-game-text-dim">כותרת הפרק</Label>
                    <Input
                      value={chapterForm.title}
                      onChange={(e) => setChapterForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="למשל: מגן השמיים – פתיחה"
                      className="bg-game-bg/60 border-game-accent/20"
                    />
                  </div>
                  <div>
                    <Label className="text-game-text-dim">תיאור / טקסט עלילה (narrative_text)</Label>
                    <Textarea
                      value={chapterForm.narrative_text}
                      onChange={(e) => setChapterForm(f => ({ ...f, narrative_text: e.target.value }))}
                      rows={3}
                      className="bg-game-bg/60 border-game-accent/20"
                    />
                  </div>
                  <div>
                    <Label className="text-game-text-dim">מקור (origin_key)</Label>
                    <Select value={chapterForm.origin_key || '_'} onValueChange={(v) => setChapterForm(f => ({ ...f, origin_key: v === '_' ? '' : v }))}>
                      <SelectTrigger className="bg-game-bg/60 border-game-accent/20">
                        <SelectValue placeholder="ללא" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">ללא</SelectItem>
                        {ORIGIN_KEYS.map((k) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-game-text-dim">תקציב התחלתי (starting_budget)</Label>
                    <Input
                      type="number"
                      value={chapterForm.starting_budget}
                      onChange={(e) => setChapterForm(f => ({ ...f, starting_budget: e.target.value }))}
                      placeholder="3800"
                      className="bg-game-bg/60 border-game-accent/20"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Label className="text-game-text-dim">גלים (waves) – JSON</Label>
                      <span className="text-game-text-dim text-xs">
                        {(() => {
                          try {
                            const arr = JSON.parse(chapterForm.wavesJson || '[]');
                            return Array.isArray(arr) ? `כמות גלים: ${arr.length}` : '—';
                          } catch {
                            return 'JSON לא תקין';
                          }
                        })()}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-game-accent/50 text-game-accent text-xs h-7"
                        onClick={() => setChapterForm(f => ({
                          ...f,
                          wavesJson: JSON.stringify([
                            { threats: [{ type: 'rocket', count: 3, delay: 0 }], spawnInterval: 2000, description: 'גל 1' },
                            { threats: [{ type: 'drone', count: 2, delay: 0 }], spawnInterval: 2500, description: 'גל 2' },
                          ], null, 2),
                        }))}
                      >
                        הדבק תבנית גלים
                      </Button>
                    </div>
                    <Textarea
                      value={chapterForm.wavesJson}
                      onChange={(e) => setChapterForm(f => ({ ...f, wavesJson: e.target.value }))}
                      rows={12}
                      className="font-mono text-sm bg-game-bg/60 border-game-accent/20"
                    />
                    {chapterFormError && <p className="text-red-400 text-xs mt-1">{chapterFormError}</p>}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setChapterDialog(null)} className="border-game-accent/50">ביטול</Button>
                  <Button onClick={saveChapter} className="bg-game-accent text-game-panel">שמירה</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <section className="bg-game-panel/60 border border-game-accent/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-game-accent">הגדרות משחק (key-value)</h2>
                <div className="flex gap-2">
                  <Button size="sm" onClick={openConfigAdd} className="bg-game-accent text-game-panel">
                    <Plus className="h-4 w-4 ml-1" /> הוסף שורה
                  </Button>
                  <Button size="sm" onClick={() => loadGameConfig()} disabled={loadingConfig} variant="outline" className="border-game-accent/50">
                    {loadingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : 'רענן'}
                  </Button>
                </div>
              </div>
              {gameConfigRows.length === 0 && !loadingConfig && (
                <p className="text-game-text-dim text-sm mb-4">אין הגדרות מהמסד. האפליקציה משתמשת בערכי ברירת המחדל מקוד. הוסף שורה כדי לדרוס ערך (למשל LASER_UNLOCK_WAVE, STORY_MODE_STARTING_BUDGET).</p>
              )}
              <ul className="space-y-2">
                {gameConfigRows.map((row) => (
                  <li key={row.key} className="flex items-center justify-between p-3 bg-game-bg/40 rounded-lg text-sm font-mono">
                    <span className="truncate">{row.key} = {JSON.stringify(row.value).slice(0, 80)}{JSON.stringify(row.value).length > 80 ? '…' : ''}</span>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="border-game-accent/50" onClick={() => openConfigEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-400 border-red-400/50" onClick={async () => {
                        await supabase.from('game_config').delete().eq('key', row.key);
                        loadGameConfig();
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-game-text-dim text-xs mt-4">מפתחות נתמכים: LASER_UNLOCK_WAVE (מספר), ENDLESS_MODE_START_WAVE, SHORT_RANGE / MEDIUM_RANGE / LONG_RANGE / LASER (אובייקט JSON), STORY_MODE_STARTING_BUDGET, DIAMONDS_PER_DAILY_CHALLENGE, DIAMOND_TO_BUDGET_RATIO.</p>
            </section>

            <Dialog open={configDialog !== null} onOpenChange={(open) => !open && setConfigDialog(null)}>
              <DialogContent className="bg-game-panel border-game-accent/30 text-game-text max-w-lg" dir="rtl">
                <DialogHeader>
                  <DialogTitle>{configDialog === 'add' ? 'הוסף הגדרת משחק' : 'ערוך הגדרה'}</DialogTitle>
                  <DialogDescription>מפתח וערך (JSON). ערכים שמוגדרים כאן מחליפים את ברירת המחדל מקובץ constants.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div>
                    <Label className="text-game-text-dim">מפתח (key)</Label>
                    {configDialog === 'add' && (
                      <Select
                        value={configForm.key || '_'}
                        onValueChange={(v) => v !== '_' && setConfigForm(f => ({ ...f, key: v }))}
                      >
                        <SelectTrigger className="bg-game-bg/60 border-game-accent/20 mt-1">
                          <SelectValue placeholder="בחר מפתח מוכן או הקלד למטה" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_">— בחר מפתח —</SelectItem>
                          {KNOWN_CONFIG_KEYS.map((k) => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      value={configForm.key}
                      onChange={(e) => setConfigForm(f => ({ ...f, key: e.target.value }))}
                      placeholder={configDialog === 'add' ? 'או הקלד מפתח' : ''}
                      className="bg-game-bg/60 border-game-accent/20 mt-1"
                      disabled={configDialog === 'edit'}
                    />
                    {configDialog === 'add' && (
                      <p className="text-game-text-dim text-xs mt-1">מפתחות נתמכים: {KNOWN_CONFIG_KEYS.join(', ')}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-game-text-dim">ערך (value)</Label>
                    {CONFIG_NUMBER_KEYS.includes(configForm.key as typeof CONFIG_NUMBER_KEYS[number]) && (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          value={(() => {
                            try {
                              const n = JSON.parse(configForm.valueJson);
                              return typeof n === 'number' ? n : '';
                            } catch {
                              return '';
                            }
                          })()}
                          onChange={(e) => {
                            const v = e.target.value;
                            const num = v === '' ? 0 : Number(v);
                            setConfigForm(f => ({ ...f, valueJson: String(Number.isFinite(num) ? num : 0) }));
                          }}
                          className="bg-game-bg/60 border-game-accent/20 w-32"
                        />
                        <span className="text-game-text-dim text-xs">או ערוך JSON למטה</span>
                      </div>
                    )}
                    <Textarea
                      value={configForm.valueJson}
                      onChange={(e) => setConfigForm(f => ({ ...f, valueJson: e.target.value }))}
                      rows={CONFIG_NUMBER_KEYS.includes(configForm.key as typeof CONFIG_NUMBER_KEYS[number]) ? 2 : 6}
                      className="font-mono text-sm bg-game-bg/60 border-game-accent/20 mt-1"
                      placeholder="מספר: 5  |  אובייקט: { &quot;range&quot;: 52 }"
                    />
                    {configFormError && <p className="text-red-400 text-xs mt-1">{configFormError}</p>}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfigDialog(null)} className="border-game-accent/50">ביטול</Button>
                  <Button onClick={saveConfig} className="bg-game-accent text-game-panel">שמירה</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex gap-4">
          <Button asChild variant="outline" className="border-game-accent/50 text-game-accent" onClick={() => { loadChallenges(); loadChapters(); loadGameConfig(); }}>
            <Link to="/">
              <ArrowRight className="h-4 w-4 ml-2" />
              חזרה למשחק
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
