/**
 * Game balance constants - ערכי איזון משחק
 *
 * תיעוד קצר:
 * - STARTING_BUDGET/MORALE: משאבים בהתחלת משחק; מושפעים ממצב קושי.
 * - *_COST: עלות רכישת סוללה/רדאר; *_RELOAD_COST: מילוי תחמושת.
 * - SHORT/MEDIUM/LONG_RANGE, LASER, THAAD, DAVID: טווח, תחמושת, זמן טעינה, מהירות טיל.
 * - DRONE/BALLISTIC/CRUISE_REWARD: תגמול תקציב על יירוט לפי סוג איום.
 * - MORALE_DAMAGE_BY_THREAT: נזק מורל כשאיום פוגע בעיר (לפי סוג).
 * - WAVE_COMPLETE_BONUS: בונוס תקציב בסיום גל.
 * - LASER_UNLOCK_WAVE: מגל זה לייזר זמין; ENDLESS_MODE_START_WAVE: התחלת מצב אינסוף.
 * - PREPARATION_DURATION_MS: זמן שלב הכנה בין גלים (להצבת מערכות) – אחריו ההתקפה מתחילה אוטומטית.
 */

export const PREPARATION_DURATION_MS = 20_000; // 20 seconds to place systems before wave starts

export const GAME_CONFIG = {
  // Canvas settings
  CANVAS_WIDTH: 1200,
  CANVAS_HEIGHT: 800,
  
  // Grid settings
  GRID_SIZE: 40,
  GRID_COLS: 30,
  GRID_ROWS: 20,
  
  // Starting resources – economy: תקציב שמאפשר גם תחמושת וגם מערכות גילוי/יירוט
  STARTING_BUDGET: 3400,
  STARTING_MORALE: 100,
  // Economy: בונוס גל גבוה יותר כדי לאפשר רכישת תחמושת + רדארים/סוללות

  // Battery costs
  SHORT_RANGE_COST: 180,
  MEDIUM_RANGE_COST: 320,
  LONG_RANGE_COST: 450,
  LASER_COST: 900,
  
  // Reload costs - affordable so players can refill
  SHORT_RANGE_RELOAD_COST: 70,
  MEDIUM_RANGE_RELOAD_COST: 110,
  LONG_RANGE_RELOAD_COST: 150,
  
  // Battery stats – reduced ranges; defense only under radar coverage; slower projectiles for visible interception
  SHORT_RANGE: {
    range: 52,
    maxAmmo: 5,
    reloadTime: 1000, // ms
    projectileSpeed: 6,
  },
  MEDIUM_RANGE: {
    range: 90,
    maxAmmo: 4,
    reloadTime: 1500, // ms
    projectileSpeed: 8,
  },
  LONG_RANGE: {
    range: 135,
    maxAmmo: 3,
    reloadTime: 2000, // ms
    projectileSpeed: 10,
  },
  LASER: {
    range: 52,  // זהה לכיפת ברזל (shortRange)
    maxHeatTime: 3000, // 3 seconds before overheat
    cooldownTime: 5000, // 5 seconds cooldown
    damagePerSecond: 0.5, // 1 HP per target → 2 seconds to kill one target
  },
  // THAAD – סיוע ברית (ארה"ב), רק דרך כפתור "סיוע ברית", לא נמכר בסרגל; מגיע עם 20 טילים
  THAAD: {
    range: 160,
    maxAmmo: 20,
    reloadTime: 2500,
    projectileSpeed: 12,
  },
  THAAD_COST: 1200,
  THAAD_RELOAD_COST: 200,

  // David's Sling – טווח בינוני–ארוך, נגד שיוט ובליסטי
  DAVID: {
    range: 110,
    maxAmmo: 8,
    reloadTime: 1800,
    projectileSpeed: 11,
  },
  DAVID_COST: 380,
  DAVID_RELOAD_COST: 95,

  // Arrow 2 – גרסה קודמת לחץ 3, זול מחץ 3, נגד שיוט ובליסטי
  ARROW2: {
    range: 120,
    maxAmmo: 4,
    reloadTime: 1900,
    projectileSpeed: 9,
  },
  ARROW2_COST: 350,
  ARROW2_RELOAD_COST: 85,

  // Threat rewards – higher so player can afford systems in later waves
  DRONE_REWARD: 110,
  BALLISTIC_REWARD: 240,
  CRUISE_REWARD: 240,
  
  // Threat speeds (pixels per frame at 60fps) – slow enough for interceptors to catch
  DRONE_SPEED: 0.35,
  BALLISTIC_SPEED: 1.0,
  CRUISE_SPEED: 0.65,
  
  // Morale damage per threat type (stronger/advanced threats = more morale loss)
  CITY_HIT_MORALE_DAMAGE: 15, // default/fallback
  MORALE_DAMAGE_BY_THREAT: {
    rocket: 5,
    drone: 8,
    cruise: 15,
    ballistic: 18,
    fighter: 14,
    helicopter: 10,
    glide_bomb: 14,
    stealth: 22,
    armored: 25,
    swarm: 6,
    decoy: 3,
    emp: 20,
    splitter: 16,
  } as Record<string, number>,

  // Last stand: when morale ≤ this %, each intercept hit counts as extra damage (creative 3)
  LAST_STAND_MORALE_THRESHOLD: 25,
  LAST_STAND_DAMAGE_PER_HIT: 2,
  
  // Wave completion bonus (economy) – מאפשר תחמושת + מערכות
  WAVE_COMPLETE_BONUS: 450,

  // Diamonds awarded only on daily task (wave) completion
  DIAMONDS_PER_WAVE_COMPLETE: 3,
  // Diamonds per completed daily challenge (once per challenge)
  DIAMONDS_PER_DAILY_CHALLENGE: 3,
  // Shop: 1 diamond = this much budget when paying with diamonds (cost conversion); same ratio for buying budget with diamonds
  DIAMOND_TO_BUDGET_RATIO: 200,
  /** Budget added per diamond when buying budget with diamonds in shop */
  BUDGET_PER_DIAMOND: 200,
  
  // Story mode: higher starting budget so player can buy systems (radar + batteries)
  STORY_MODE_STARTING_BUDGET: 3800,

  // Wave unlock
  LASER_UNLOCK_WAVE: 5,
  ENDLESS_MODE_START_WAVE: 11,

  // From this wave onward: 10% chance interceptor "misses" (second missile auto-fires if ammo)
  INTERCEPT_MISS_FROM_WAVE: 5,
  INTERCEPT_MISS_CHANCE: 0.1,
  
  // Upgrade costs
  UPGRADE_COSTS: {
    reloadSpeed: [300, 500, 800, 1200],
    radarRange: [400, 600, 900, 1400],
    maxAmmo: [350, 550, 850, 1300],
  },
  
  // Upgrade bonuses
  UPGRADE_BONUSES: {
    reloadSpeed: 0.2, // 20% faster per level
    radarRange: 0.15, // 15% more range per level
    maxAmmo: 2, // +2 ammo per level
  },

  // Shop: one-time morale boost (diamonds)
  MORALE_BOOST_COST_DIAMONDS: 3,
  MORALE_BOOST_AMOUNT: 15,

  // Daily reward: diamonds per day (1–7, then repeats)
  DAILY_REWARD_DIAMONDS: [1, 2, 2, 3, 3, 4, 5],

  // Main menu shop – special items (diamonds); balanced so ~1 week daily ≈ one full coverage
  FULL_COVERAGE_COST_DIAMONDS: 25,
  FULL_COVERAGE_SECONDS: 45,
  // Bonus starting morale for next game (main menu shop)
  EXTRA_STARTING_MORALE_COST_DIAMONDS: 12,
  EXTRA_STARTING_MORALE_AMOUNT: 15,
} as const;

// City positions on the map (normalized 0-1, aligned with ISRAEL_MAP_BOUNDS)
export const CITY_POSITIONS = [
  { id: 'haifa', name: 'חיפה', x: 0.435, y: 0.143 },
  { id: 'nahariya', name: 'נהריה', x: 0.498, y: 0.088 },
  { id: 'acre', name: 'עכו', x: 0.484, y: 0.109 },
  { id: 'tiberias', name: 'טבריה', x: 0.754, y: 0.143 },
  { id: 'netanya', name: 'נתניה', x: 0.356, y: 0.261 },
  { id: 'hadera', name: 'חדרה', x: 0.394, y: 0.235 },
  { id: 'telaviv', name: 'תל אביב', x: 0.313, y: 0.324 },
  { id: 'ashdod', name: 'אשדוד', x: 0.235, y: 0.399 },
  { id: 'ashkelon', name: 'אשקלון', x: 0.191, y: 0.431 },
  { id: 'jerusalem', name: 'ירושלים', x: 0.567, y: 0.406 },
  { id: 'beersheva', name: 'באר שבע', x: 0.319, y: 0.538 },
  { id: 'dimona', name: 'דימונה', x: 0.461, y: 0.585 },
  { id: 'eilat', name: 'אילת', x: 0.413, y: 0.972 },
] as const;

// Colors for the cold tech theme
export const COLORS = {
  background: 'hsl(220, 30%, 8%)',
  grid: 'hsla(185, 100%, 50%, 0.15)',
  gridBright: 'hsla(185, 100%, 50%, 0.3)',
  country: 'hsla(185, 80%, 40%, 0.4)',
  countryBorder: 'hsl(185, 100%, 50%)',
  city: 'hsl(185, 100%, 60%)',
  cityGlow: 'hsla(185, 100%, 60%, 0.5)',
  cityThreatened: 'hsl(0, 100%, 60%)',
  
  // Threats
  drone: 'hsl(50, 100%, 50%)',
  ballistic: 'hsl(0, 100%, 50%)',
  cruise: 'hsl(30, 100%, 50%)',
  
  // Batteries
  shortRange: 'hsl(185, 100%, 50%)',
  mediumRange: 'hsl(40, 100%, 50%)',
  longRange: 'hsl(260, 100%, 60%)',
  laser: 'hsl(120, 100%, 50%)',
  
  // Projectiles
  projectile: 'hsl(185, 100%, 70%)',
  projectileTrail: 'hsla(185, 100%, 50%, 0.3)',
  laserBeam: 'hsl(120, 100%, 60%)',
  
  // Explosions
  explosion: 'hsl(30, 100%, 60%)',
  explosionCore: 'hsl(50, 100%, 80%)',
  
  // UI
  text: 'hsl(185, 50%, 90%)',
  textDim: 'hsl(185, 30%, 60%)',
} as const;
