// Random Events System - מערכת אירועים אקראיים

export type EventType = 
  | 'satellite_support'    // גילוי מוקדם
  | 'fast_reload'          // טעינה מהירה
  | 'lightning_storm'      // סערה - טווח נמוך, איומים איטיים
  | 'bonus_wave'           // איומים נוספים עם כפל פרסים
  | 'emergency_budget'     // תקציב חירום
  | 'radar_boost'          // הגדלת טווח רדאר
  | 'ammo_resupply';       // מילוי תחמושת

export interface RandomEvent {
  id: string;
  type: EventType;
  name: string;
  description: string;
  icon: string;
  duration?: number;      // ms, undefined = instant effect
  effect: EventEffect;
}

export interface EventEffect {
  rangeModifier?: number;         // 1.0 = normal, 0.8 = -20%
  threatSpeedModifier?: number;   // 1.0 = normal, 0.7 = -30%
  reloadSpeedModifier?: number;   // 1.0 = normal, 2.0 = 2x faster
  rewardMultiplier?: number;      // 1.0 = normal, 2.0 = 2x rewards
  budgetChange?: number;          // Instant budget change
  moraleChange?: number;          // Instant morale change
  radarRangeModifier?: number;    // Radar range multiplier
  extraThreats?: number;          // Additional threats to spawn
}

export interface EventTrigger {
  minWave: number;
  probability: number; // 0-1
  event: RandomEvent;
}

// Pre-defined events
export const RANDOM_EVENTS: RandomEvent[] = [
  {
    id: 'satellite_support',
    type: 'satellite_support',
    name: '🛰️ תמיכה מלוויין',
    description: 'גילוי מוקדם של איומים - טווח רדאר +30%',
    icon: '🛰️',
    duration: 30000,
    effect: {
      radarRangeModifier: 1.3,
    },
  },
  {
    id: 'fast_reload',
    type: 'fast_reload',
    name: '🔧 תחזוקה מהירה',
    description: 'מהירות טעינה x2 למשך 15 שניות',
    icon: '🔧',
    duration: 15000,
    effect: {
      reloadSpeedModifier: 2.0,
    },
  },
  {
    id: 'lightning_storm',
    type: 'lightning_storm',
    name: '⚡ סערת ברקים',
    description: 'טווח -20%, אבל איומים איטיים ב-30%',
    icon: '⚡',
    duration: 20000,
    effect: {
      rangeModifier: 0.8,
      threatSpeedModifier: 0.7,
    },
  },
  {
    id: 'bonus_wave',
    type: 'bonus_wave',
    name: '🎯 גל בונוס',
    description: '5 איומים נוספים, כל יירוט שווה x2',
    icon: '🎯',
    duration: 25000,
    effect: {
      extraThreats: 5,
      rewardMultiplier: 2.0,
    },
  },
  {
    id: 'emergency_budget',
    type: 'emergency_budget',
    name: '💰 תקציב חירום',
    description: '+1000 תקציב מיידי, -10 מורל',
    icon: '💰',
    effect: {
      budgetChange: 1000,
      moraleChange: -10,
    },
  },
  {
    id: 'radar_boost',
    type: 'radar_boost',
    name: '📡 שיפור רדאר',
    description: 'טווח רדאר +50% למשך 20 שניות',
    icon: '📡',
    duration: 20000,
    effect: {
      radarRangeModifier: 1.5,
    },
  },
  {
    id: 'ammo_resupply',
    type: 'ammo_resupply',
    name: '📦 אספקת תחמושת',
    description: 'כל הסוללות מתמלאות בתחמושת',
    icon: '📦',
    effect: {
      // Handled specially in game logic
    },
  },
];

// Event triggers per wave
export const EVENT_TRIGGERS: EventTrigger[] = [
  { minWave: 3, probability: 0.30, event: RANDOM_EVENTS[0] }, // Satellite support
  { minWave: 4, probability: 0.25, event: RANDOM_EVENTS[1] }, // Fast reload
  { minWave: 5, probability: 0.20, event: RANDOM_EVENTS[2] }, // Lightning storm
  { minWave: 6, probability: 0.10, event: RANDOM_EVENTS[3] }, // Bonus wave
  { minWave: 7, probability: 0.15, event: RANDOM_EVENTS[4] }, // Emergency budget
  { minWave: 8, probability: 0.20, event: RANDOM_EVENTS[5] }, // Radar boost
  { minWave: 9, probability: 0.15, event: RANDOM_EVENTS[6] }, // Ammo resupply
];

// Roll for random event at wave start
export function rollForEvent(waveNumber: number): RandomEvent | null {
  const eligibleTriggers = EVENT_TRIGGERS.filter(t => waveNumber >= t.minWave);
  
  for (const trigger of eligibleTriggers) {
    if (Math.random() < trigger.probability) {
      return trigger.event;
    }
  }
  
  return null;
}

// Get event by ID
export function getEventById(id: string): RandomEvent | undefined {
  return RANDOM_EVENTS.find(e => e.id === id);
}
