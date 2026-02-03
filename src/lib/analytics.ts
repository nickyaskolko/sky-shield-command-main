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
  pageView: () => trackEvent('page_view'),
  
  // משחק
  gameStart: (mode: string) => trackEvent('game_start', { mode }),
  waveComplete: (wave: number, score: number) => trackEvent('wave_complete', { wave, score }),
  gameOver: (score: number, wavesCompleted: number) => trackEvent('game_over', { score, wavesCompleted }),
  
  // חנות
  shopOpen: () => trackEvent('shop_open'),
  purchase: (itemId: string, price: number) => trackEvent('purchase', { itemId, price }),
  
  // אתגרים
  challengeComplete: (challengeId: string) => trackEvent('challenge_complete', { challengeId }),
  
  // כללי
  custom: (name: string, data?: Record<string, unknown>) => trackEvent(name, data || {}),
};
