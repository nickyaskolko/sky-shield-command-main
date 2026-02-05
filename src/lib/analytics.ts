// src/lib/analytics.ts
// מערכת אנליטיקס פשוטה עם Supabase

import { supabase } from './supabase';

// === מזהים ===

function getVisitorId(): string {
  const KEY = 'sky_shield_visitor_id';
  let visitorId = localStorage.getItem(KEY);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(KEY, visitorId);
  }
  return visitorId;
}

function getSessionId(): string {
  const KEY = 'sky_shield_session_id';
  let sessionId = sessionStorage.getItem(KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(KEY, sessionId);
  }
  return sessionId;
}

// === זיהוי מכשיר ===

function getDeviceInfo() {
  const ua = navigator.userAgent;

  let deviceType = 'desktop';
  if (/Mobi|Android/i.test(ua)) deviceType = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) deviceType = 'tablet';

  let browser = 'unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';

  let os = 'unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';

  return { deviceType, browser, os };
}

// === שליפת מיקום (אופציונלי) ===

let cachedLocation: { country: string | null; city: string | null } | null = null;

async function getLocation(): Promise<{ country: string | null; city: string | null }> {
  if (cachedLocation) return cachedLocation;
  
  try {
    // שירות חינמי - עד 45,000 בקשות ביום
    const res = await fetch('https://ipapi.co/json/', { 
      signal: AbortSignal.timeout(3000) 
    });
    if (!res.ok) throw new Error('Location fetch failed');
    const data = await res.json();
    cachedLocation = { 
      country: data.country_name || null, 
      city: data.city || null 
    };
    return cachedLocation;
  } catch {
    cachedLocation = { country: null, city: null };
    return cachedLocation;
  }
}

// === שליחת אירוע ===

export async function trackEvent(
  eventType: string,
  eventData: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { deviceType, browser, os } = getDeviceInfo();
    const location = await getLocation();
    
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('analytics_events').insert({
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      user_id: user?.id || null,
      event_type: eventType,
      event_data: eventData,
      device_type: deviceType,
      browser,
      os,
      country: location.country,
      city: location.city,
      referrer: document.referrer || null,
      page_url: window.location.href,
    });
  } catch (error) {
    // לא להפיל את האפליקציה בגלל אנליטיקס
    console.error('[Analytics]', error);
  }
}

// === קיצורים נוחים ===

export const analytics = {
  // צפיות בדף
  pageView: (extra?: { path?: string; is_logged_in?: boolean }) =>
    trackEvent('page_view', extra || {}),

  // משחק
  gameStart: (mode: string, has_saved_game?: boolean) =>
    trackEvent('game_start', { mode, has_saved_game: !!has_saved_game }),
  waveComplete: (wave: number, score: number, perfect?: boolean, combo_max?: number) =>
    trackEvent('wave_complete', { wave, score, perfect: !!perfect, combo_max: combo_max ?? 0 }),
  gameOver: (score: number, wavesCompleted: number, wave?: number, time_played_seconds?: number) =>
    trackEvent('game_over', { score, wavesCompleted, wave: wave ?? 0, time_played_seconds: time_played_seconds ?? 0 }),

  // חנות
  shopOpen: () => trackEvent('shop_open'),
  purchase: (itemId: string, price: number, currency: 'diamonds' | 'budget' = 'diamonds') =>
    trackEvent('purchase', { itemId, price, currency }),

  // אתגרים
  challengeComplete: (challengeId: string) => trackEvent('challenge_complete', { challengeId }),

  // התחברות חסומה
  authBlocked: (userId?: string) => trackEvent('auth_blocked', { user_id: userId ?? null }),

  // מצב סיפור
  storyStart: (chapterId: string) => trackEvent('story_start', { chapter_id: chapterId }),
  storyChapterComplete: (chapterId: string, wave: number) =>
    trackEvent('story_chapter_complete', { chapter_id: chapterId, wave }),

  // פרס יומי
  dailyRewardClaim: (day: number, diamonds: number) =>
    trackEvent('daily_reward_claim', { day, diamonds }),

  // הדרכה
  tutorialStart: () => trackEvent('tutorial_start'),
  tutorialComplete: () => trackEvent('tutorial_complete'),
  tutorialSkip: (step: number) => trackEvent('tutorial_skip', { step }),

  // המשך משחק
  savedGameContinue: () => trackEvent('saved_game_continue'),
  resumeFail: () => trackEvent('resume_fail'),

  // כללי
  custom: (name: string, data?: Record<string, unknown>) => trackEvent(name, data || {}),
};
