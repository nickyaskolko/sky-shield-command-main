// Hebrew translations - תרגומים לעברית

export const he = {
  // Game title
  gameTitle: 'מגן השמיים',
  
  // Main menu
  startGame: 'התחל משחק',
  continue: 'המשך',
  exit: 'יציאה',
  newGame: 'משחק חדש',
  
  // HUD
  budget: 'תקציב',
  wave: 'גל',
  score: 'ניקוד',
  morale: 'מורל',
  moraleLabel: 'מורל הציבור',
  
  // Action bar - Batteries
  shortRange: 'טווח קצר',
  ironDome: 'כיפת ברזל',
  patriot: 'פטריוט',
  arrow3: 'חץ 3',
  david: 'דוד (David\'s Sling)',
  arrow2: 'חץ 2',
  longRange: 'טווח ארוך',
  laser: 'לייזר',
  laserLocked: 'לייזר (נעול)',
  reload: 'טען סוללה',
  cancel: 'בטל',
  build: 'בנה סוללה',
  
  // Action bar - Radars
  radarBasic: 'רדאר בסיסי',
  radarAdvanced: 'רדאר מתקדם',
  radarLongRange: 'רדאר טווח ארוך',
  buildRadar: 'בנה רדאר',
  
  // Battery info
  ammo: 'תחמושת',
  range: 'טווח',
  reloadCost: 'עלות תחמושת',
  reloadButton: 'קנה תחמושת (טען)',
  sellButton: 'מכור',
  heat: 'חום',
  cooling: 'מתקרר',
  overheated: 'התחמם!',
  
  // Threats - expanded
  drone: 'רחפן',
  ballisticMissile: 'טיל בליסטי',
  cruiseMissile: 'טיל שיוט',
  fighterJet: 'מטוס קרב',
  attackHelicopter: 'מסוק קרב',
  glideBomb: 'פצצה מתחלקת',
  incomingThreats: 'איומים נכנסים',
  
  // Wave messages
  waveIncoming: 'גל חדש מתקרב!',
  waveComplete: 'הגל הושלם!',
  waveNumber: 'גל {0}',
  nextWave: 'הגל הבא',
  
  // Shop
  shopTitle: 'חנות שדרוגים',
  upgradeReloadSpeed: 'מהירות טעינת סוללה',
  upgradeRadarRange: 'טווח יירוט',
  upgradeMaxAmmo: 'תחמושת מקסימלית',
  cost: 'עלות',
  level: 'רמה',
  maxLevel: 'מקסימום',
  buy: 'קנה',
  purchased: 'נרכש',
  unlockLaser: 'פתח קרן לייזר',
  laserUnlocked: 'לייזר נפתח!',
  
  // Alerts
  lowAmmoWarning: 'אזהרה: תחמושת נמוכה!',
  cityHit: 'עיר נפגעה! מורל ירד',
  cityHitDetail: '{0} פגע ב-{1}',
  damageLog: 'יומן פגיעות',
  lowMorale: 'אזהרה: מורל נמוך!',
  
  // Game over
  gameOver: 'סוף המשחק',
  moraleCrashed: 'המורל התרסק',
  finalScore: 'ניקוד סופי',
  wavesCompleted: 'גלים שהושלמו',
  interceptions: 'יירוטים',
  playAgain: 'שחק שוב',
  newHighScore: 'שיא חדש!',
  
  // Monetization placeholders
  emergencyFunds: 'קרנות חירום 🎬',
  supportDev: 'תמוך במפתח ❤️',
  watchAd: 'צפה לקבל',
  
  // Tutorial hints
  hintPlaceBattery: 'לחץ על המפה כדי למקם סוללה',
  hintPlaceRadar: 'לחץ על המפה כדי למקם רדאר',
  hintSelectBattery: 'לחץ על סוללה לראות פרטים',
  hintReload: 'אל תשכח לטעון סוללות!',
  
  // Stats
  intercepted: 'יורט',
  missed: 'פספס',
  accuracy: 'דיוק',
  
  // Endless mode
  endlessMode: 'מצב אינסופי',
  endlessModeUnlocked: 'מצב אינסופי נפתח!',
  
  // Pause
  paused: 'מושהה',
  resume: 'המשך',
  
  // Instructions
  instructions: 'הוראות',
  howToPlay: 'איך לשחק',
  instructionBuild: 'בנה סוללות הגנה על המפה',
  instructionDefend: 'יירט איומים לפני שפוגעים בערים',
  instructionReload: 'טען תחמושת כשנגמרת',
  instructionUpgrade: 'שדרג בחנות בין גלים',
  instructionRadar: 'בנה רדארים לגילוי מוקדם של איומים',
} as const;

export type TranslationKey = keyof typeof he;

export function t(key: TranslationKey, ...args: (string | number)[]): string {
  let text: string = he[key] || key;
  args.forEach((arg, index) => {
    text = text.replace(`{${index}}`, String(arg));
  });
  return text;
}
