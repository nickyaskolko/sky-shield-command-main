# סיכום קוד: משחק "מגן השמיים" - Iron Dome Defense Game

## סקירה כללית
משחק הגנה אסטרטגי בזמן אמת שבו השחקן מגן על ערי ישראל מפני איומים אוויריים באמצעות מערכות יירוט שונות.

**טכנולוגיות:** React 18, TypeScript, Zustand, Leaflet Maps, Framer Motion, Tailwind CSS

---

## מבנה הפרויקט

```
src/
├── components/game/          # קומפוננטות משחק
│   ├── GameWithLeaflet.tsx   # קומפוננטה ראשית - לולאת משחק
│   ├── GameMapLeaflet.tsx    # מפה אינטראקטיבית
│   ├── HUD.tsx               # ממשק משתמש עליון
│   ├── MainMenu.tsx          # תפריט ראשי
│   ├── ShopModal.tsx         # חנות בטריות
│   ├── ComboDisplay.tsx      # תצוגת קומבו
│   ├── AchievementToast.tsx  # הודעות הישגים
│   ├── EventNotification.tsx # אירועים אקראיים
│   └── ...
├── store/
│   ├── gameStore.ts          # Zustand - מצב משחק
│   └── playerStore.ts        # Zustand - פרופיל שחקן (localStorage)
├── lib/
│   ├── constants.ts          # קבועי משחק
│   ├── audio/SoundManager.ts # מערכת סאונד (Web Audio API)
│   └── game/
│       ├── entities.ts       # טיפוסי נתונים
│       ├── waves.ts          # הגדרות גלים
│       ├── physics.ts        # פיזיקה ותנועה
│       ├── achievements.ts   # מערכת הישגים
│       ├── randomEvents.ts   # אירועים אקראיים
│       └── strategies/       # Strategy Pattern לבטריות
└── hooks/
    ├── useGameLoop.ts        # לולאת משחק
    ├── useGameState.ts       # ניהול מצב
    └── useSoundManager.ts    # ניהול סאונד
```

---

## סוגי נתונים עיקריים

### Battery (סוללת הגנה)
```typescript
type BatteryType = 'shortRange' | 'longRange' | 'laser' | 'antiAir' | 'shorad';

interface Battery {
  id: string;
  type: BatteryType;
  x: number; y: number;        // מיקום על המפה (0-1)
  ammo: number;                // תחמושת נוכחית
  maxAmmo: number;
  isReloading: boolean;
  reloadProgress: number;      // 0-1
  range: number;               // טווח בפיקסלים
  // Laser specific:
  heatLevel: number;
  isOverheated: boolean;
  cooldownProgress: number;
}
```

### Threat (איום)
```typescript
type ThreatType = 
  | 'drone' | 'ballistic' | 'cruise' | 'fighter' | 'helicopter' | 'glide_bomb'
  | 'stealth' | 'armored' | 'swarm' | 'decoy' | 'emp' | 'splitter';

interface Threat {
  id: string;
  type: ThreatType;
  x: number; y: number;        // מיקום נוכחי
  targetCityId: string;        // עיר יעד
  speed: number;
  hp: number;                  // נקודות חיים (armored=5, רגיל=1)
  angle: number;
  spawnLocation: string;       // מאיפה הגיע
  // Special properties:
  isStealthed?: boolean;       // stealth
  empRadius?: number;          // emp
  swarmUnits?: number;         // swarm
  isDecoy?: boolean;           // decoy
  hasSplit?: boolean;          // splitter
}
```

### GameState (מצב משחק - Zustand)
```typescript
interface GameState {
  // Core
  gamePhase: 'menu' | 'playing' | 'paused' | 'shopping' | 'waveComplete' | 'gameOver';
  wave: number;
  budget: number;
  morale: number;              // 0-100, משחק נגמר ב-0
  score: number;
  
  // Entities
  batteries: Battery[];
  threats: Threat[];
  projectiles: Projectile[];
  explosions: Explosion[];
  cities: City[];
  
  // Combo system
  combo: {
    current: number;
    maxCombo: number;
    lastInterceptTime: number;
    comboWindow: number;       // 3000ms default
    multiplier: number;
  };
  
  // Statistics
  totalInterceptions: number;
  consecutiveInterceptions: number;
  waveDamage: number;
  batteriesUsed: string[];
}
```

### PlayerProfile (פרופיל שחקן - נשמר ב-localStorage)
```typescript
interface PlayerProfile {
  diamonds: number;            // מטבע קבוע
  
  permanentUpgrades: {
    startingBudget: number;    // 0-3 (בונוס: 0/500/1000/1500)
    moraleDrain: number;       // 0-3 (הפחתה: 0/20%/35%/50%)
    reloadSpeed: number;       // 0-3 (בונוס: 0/10%/20%/30%)
    comboWindow: number;       // 0-3 (בונוס: 0/1s/2s/3s)
  };
  
  achievements: string[];      // רשימת הישגים שנפתחו
  
  stats: {
    gamesPlayed: number;
    totalInterceptions: number;
    highestWave: number;
    highestCombo: number;
    totalDiamonds: number;
  };
}
```

---

## מערכות משחק עיקריות

### 1. מערכת גלים (waves.ts)
- **גלים 1-10:** מוגדרים מראש עם עלייה הדרגתית בקושי
- **גל 9-10:** כוללים איומים מיוחדים (stealth, emp, splitter)
- **מצב אינסופי (11+):** יצירה פרוצדורלית עם scaling

```typescript
// דוגמה לגל
const wave5 = {
  threats: [
    { type: 'drone', count: 4, delay: 0 },
    { type: 'helicopter', count: 2, delay: 2000 },
    { type: 'cruise', count: 2, delay: 3500 },
  ],
  spawnInterval: 1400,
};
```

### 2. מערכת קומבו
- חלון זמן: 3 שניות (ניתן לשדרוג עד 6 שניות)
- בונוס: +5% לתקציב על כל רמת קומבו
- מקסימום קומבו נשמר לסטטיסטיקות

### 3. מערכת הישגים
```typescript
const ACHIEVEMENTS = [
  { id: 'perfect_defense', name: 'הגנה מושלמת', reward: 100 },
  { id: 'sharpshooter', name: 'צלף חד', reward: 200 },      // 10 ברצף
  { id: 'combo_king', name: 'מלך הקומבו', reward: 300 },   // קומבו 20+
  { id: 'minimalist', name: 'מינימליסט', reward: 500 },    // 5 גלים עם בטריה אחת
  // ...
];
```

### 4. אירועים אקראיים
```typescript
const RANDOM_EVENTS = [
  { id: 'satellite_support', effect: '+30% טווח רדאר', duration: 30000 },
  { id: 'lightning_storm', effect: '-20% טווח, -30% מהירות איומים', duration: 20000 },
  { id: 'emergency_budget', effect: '+1000 תקציב, -10 מורל' },
  // ...
];
```

### 5. איומים מיוחדים
| סוג | מכניקה |
|-----|--------|
| stealth | נעלם/מופיע כל 5 שניות |
| armored | 5 HP, איטי יותר |
| swarm | 5 יחידות קטנות |
| decoy | לא גורם נזק |
| emp | משתק בטריות |
| splitter | מתפצל ל-3 |

---

## קבועי משחק חשובים (constants.ts)

```typescript
const GAME_CONFIG = {
  STARTING_BUDGET: 1500,
  STARTING_MORALE: 100,
  
  // עלויות בטריות
  SHORT_RANGE_COST: 200,    // Iron Dome
  LONG_RANGE_COST: 500,     // Arrow
  LASER_COST: 1000,         // Iron Beam
  ANTI_AIR_COST: 250,       // MANPAD
  SHORAD_COST: 600,         // SHORAD
  
  // סטטיסטיקות בטריות
  SHORT_RANGE: { range: 150, maxAmmo: 5, reloadTime: 1000 },
  LONG_RANGE: { range: 400, maxAmmo: 3, reloadTime: 2000 },
  LASER: { range: 300, maxHeatTime: 3000, cooldownTime: 5000 },
  ANTI_AIR: { range: 180, maxAmmo: 6, targetTypes: ['fighter', 'helicopter', 'drone'] },
  SHORAD: { range: 320, maxAmmo: 4, targetTypes: ['fighter', 'helicopter', 'cruise', 'drone'] },
  
  // פרסים
  DRONE_REWARD: 50,
  BALLISTIC_REWARD: 100,
  CRUISE_REWARD: 150,
  
  CITY_HIT_MORALE_DAMAGE: 15,
};
```

---

## לולאת משחק (GameWithLeaflet.tsx)

```
1. useEffect → requestAnimationFrame loop
2. כל frame:
   a. עדכון מיקום איומים (לכיוון ערי יעד)
   b. בדיקת טווח בטריות ← שיגור אוטומטי
   c. עדכון פרויקטילים
   d. בדיקת פגיעות (projectile ↔ threat)
   e. בדיקת פגיעות בערים
   f. עדכון אנימציות/פיצוצים
   g. בדיקת סיום גל
3. אירועים אקראיים בתחילת כל גל
4. בדיקת הישגים בסיום גל
```

---

## ערים מוגנות

```typescript
const CITY_POSITIONS = [
  { id: 'haifa', name: 'חיפה', x: 0.24, y: 0.14 },
  { id: 'telaviv', name: 'תל אביב', x: 0.22, y: 0.30 },
  { id: 'jerusalem', name: 'ירושלים', x: 0.40, y: 0.42 },
  { id: 'beersheva', name: 'באר שבע', x: 0.32, y: 0.58 },
  { id: 'eilat', name: 'אילת', x: 0.42, y: 0.86 },
];
```

---

## מקומות שיגור איומים

```typescript
const THREAT_SPAWN_LOCATIONS = [
  { name: 'לבנון', direction: 'north' },
  { name: 'סוריה', direction: 'northeast' },
  { name: 'עזה', direction: 'southwest' },
  { name: 'ים תיכון', direction: 'west' },
  { name: 'ירדן', direction: 'east' },
  { name: 'עיראק', direction: 'northeast' },
  { name: 'תימן', direction: 'south' },
  { name: 'איראן', direction: 'east' },
];
```

---

## Object Pooling (ביצועים)

```typescript
// projectilePool - מאגר פרויקטילים לשימוש חוזר
const projectile = projectilePool.acquire(battery, threat);
// ... שימוש
projectilePool.release(projectile);
```

---

## מערכת סאונד (Web Audio API)

צלילים סינתטיים ללא קבצים חיצוניים:
- `missileLaunch` - שיגור
- `explosion` - פיצוץ
- `intercept` - יירוט מוצלח
- `alarm` - איום קרוב לעיר
- `combo` - קומבו (pitch עולה עם הרמה)
- `cityHit` - פגיעה בעיר
- `waveComplete` - סיום גל

---

## בדיקות מומלצות

1. **לולאת משחק:** האם פרויקטילים מגיעים לאיומים?
2. **קומבו:** האם מתאפס אחרי 3 שניות?
3. **הישגים:** האם נשמרים ב-localStorage?
4. **איומים מיוחדים:** האם stealth מהבהב? האם splitter מתפצל?
5. **אירועים:** האם האפקטים מוחלים נכון?
6. **ביצועים:** האם יש דליפות זיכרון? (בדוק projectilePool)
7. **מורל:** האם המשחק נגמר ב-0?

---

## קבצים חשובים לעיון

| קובץ | תוכן |
|------|------|
| `src/store/gameStore.ts` | כל הלוגיקה של מצב משחק |
| `src/store/playerStore.ts` | פרופיל שחקן והתקדמות |
| `src/lib/game/entities.ts` | הגדרות טיפוסים |
| `src/lib/game/waves.ts` | תצורת גלים |
| `src/lib/game/physics.ts` | תנועה והתנגשויות |
| `src/components/game/GameWithLeaflet.tsx` | לולאת משחק ראשית |
