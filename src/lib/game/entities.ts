// Game entities - ישויות משחק

import { COLORS } from '../constants';
import { getGameConfig } from './gameConfigLoader';
import { latLngToNormalized } from './israelMap';

// Extended threat types - סוגי איומים מורחבים
export type ThreatType = 
  | 'drone' | 'rocket' | 'ballistic' | 'cruise' | 'fighter' | 'helicopter' | 'glide_bomb'
  // Special threats - איומים מיוחדים
  | 'stealth' | 'armored' | 'swarm' | 'decoy' | 'emp' | 'splitter';

export type BatteryType = 'shortRange' | 'mediumRange' | 'longRange' | 'laser' | 'thaad' | 'david' | 'arrow2';
export type AmmoPoolType = 'shortRange' | 'mediumRange' | 'longRange';
export type RadarType = 'basic' | 'advanced' | 'longRange' | 'lband' | 'naval';
export type GamePhase = 'menu' | 'playing' | 'waveComplete' | 'shop' | 'preparation' | 'gameOver' | 'paused' | 'storyChapterComplete';

// Special threat properties
export interface SpecialThreatProps {
  isStealthed?: boolean;        // For stealth - currently invisible
  stealthTimer?: number;        // Time until stealth toggle
  isDecoy?: boolean;            // For decoy - doesn't damage cities
  empRadius?: number;           // For EMP - radius of effect
  hasSplit?: boolean;           // For splitter - already split
  swarmUnits?: number;          // For swarm - remaining units
}

export interface Position {
  x: number;
  y: number;
}

export interface City {
  id: string;
  name: string;
  x: number;
  y: number;
  isTargeted: boolean;
  pulsePhase: number;
}

export interface Threat {
  id: string;
  type: ThreatType;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  targetCityId: string;
  speed: number;
  health: number;
  maxHealth: number;
  angle: number;
  progress: number; // 0-1 for arc calculation
  zigzagOffset: number; // for cruise missiles
  zigzagPhase: number;
  trailPositions: Position[];
  isDetected: boolean; // For radar detection system
  
  /** Display name of spawn origin (e.g. "עזה", "לבנון") for AlertsPanel – "לא וודאי" if missing */
  originName?: string;
  /** When the threat was created (ms); used to avoid removing at spawn and for "fell in enemy territory" */
  spawnedAt?: number;
  /** 20% chance at spawn – only these threats are removed when entering enemy territory; rest reach target or get intercepted */
  willFallInEnemyTerritory?: boolean;
  
  // Special threat properties
  special?: SpecialThreatProps;
}

export interface Battery {
  id: string;
  type: BatteryType;
  x: number;
  y: number;
  ammo: number;
  maxAmmo: number;
  range: number;
  isReloading: boolean;
  reloadProgress: number;
  targetThreatId: string | null;
  /** Last time (ms) this battery fired – used for reload cooldown with reloadSpeed upgrade */
  lastFiredAt: number;
  // Laser specific
  heatLevel: number;
  isOverheated: boolean;
  cooldownProgress: number;
  isActive: boolean; // for laser beam
  /** After killing a target, laser cannot acquire a new target until this time (ms). 1s delay between targets. */
  laserAcquireCooldownUntil?: number;
  // Anti-air targeting
  targetTypes?: ThreatType[];
}

export interface Projectile {
  id: string;
  batteryId: string;
  x: number;
  y: number;
  startX?: number;
  startY?: number;
  targetX: number;
  targetY: number;
  targetThreatId: string;
  speed: number;
  angle: number;
  trailPositions: Position[];
}

export interface Explosion {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  particles: Particle[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

export interface LaserBeam {
  batteryId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  alpha: number;
}

// Radar system - מערכת רדארים
export interface Radar {
  id: string;
  type: RadarType;
  x: number;
  y: number;
  range: number;
  detectedThreats: string[]; // IDs of threats in range
}

export interface Upgrades {
  reloadSpeed: number; // 0-4 level
  radarRange: number;
  maxAmmo: number;
}

export interface GameState {
  phase: GamePhase;
  budget: number;
  morale: number;
  score: number;
  wave: number;
  isEndless: boolean;
  
  cities: City[];
  threats: Threat[];
  batteries: Battery[];
  projectiles: Projectile[];
  explosions: Explosion[];
  laserBeams: LaserBeam[];
  radars: Radar[]; // Radar system
  
  selectedBatteryId: string | null;
  placingBatteryType: BatteryType | null;
  placingRadarType: RadarType | null; // For placing radars
  previewPosition: Position | null;
  
  upgrades: Upgrades;
  laserUnlocked: boolean;
  ammoPool: { shortRange: number; mediumRange: number; longRange: number };
  
  stats: {
    totalInterceptions: number;
    totalMissed: number;
    totalWavesCompleted: number;
    highScore: number;
  };
  
  notifications: GameNotification[];
  cityHitLog: CityHitLogEntry[];
  /** Log of threats that fell in enemy territory – shown in AlertsPanel */
  enemyTerritoryFallLog: EnemyTerritoryFallEntry[];
  screenShake: number;
  /** Seconds remaining of "full coverage" buff (2x radar) – from main menu shop */
  fullCoverageRemaining: number;
  /** From wave 8: one-time allied support (e.g. THAAD) – used this game or not */
  alliedSupportUsed: boolean;
}

export interface CityHitLogEntry {
  threatType: ThreatType;
  threatId: string;
  cityId: string;
  cityName: string;
  timestamp: number;
}

export interface EnemyTerritoryFallEntry {
  threatType: ThreatType;
  threatId: string;
  timestamp: number;
}

export interface GameNotification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  timestamp: number;
  /** Display duration in ms; default 3000 */
  duration?: number;
}

// Factory functions

export function createThreat(
  type: ThreatType,
  targetCity: City,
  canvasWidth: number,
  canvasHeight: number,
  spawnLocation?: { lat: number; lng: number; name?: string }
): Threat {
  const id = `threat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  let startX: number, startY: number;
  
  if (spawnLocation) {
    const start = latLngToNormalized(spawnLocation.lat, spawnLocation.lng, canvasWidth, canvasHeight);
    startX = start.x;
    startY = start.y;
  } else {
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
      case 0:
        startX = Math.random() * canvasWidth;
        startY = -20;
        break;
      case 1:
        startX = canvasWidth + 20;
        startY = Math.random() * canvasHeight;
        break;
      case 2:
        startX = Math.random() * canvasWidth;
        startY = canvasHeight + 20;
        break;
      default:
        startX = -20;
        startY = Math.random() * canvasHeight;
    }
  }
  
  const targetX = targetCity.x;
  const targetY = targetCity.y;
  
  // Speed based on threat type
  let speedMultiplier: number;
  const health = 1; // All threats: 1 HP – one interceptor destroys any target (no multi-hit)
  let special: SpecialThreatProps | undefined;
  switch (type) {
    case 'drone':
      speedMultiplier = getGameConfig().DRONE_SPEED;
      break;
    case 'rocket':
      speedMultiplier = getGameConfig().CRUISE_SPEED;
      break;
    case 'ballistic':
      speedMultiplier = getGameConfig().BALLISTIC_SPEED;
      break;
    case 'cruise':
      speedMultiplier = getGameConfig().CRUISE_SPEED;
      break;
    case 'fighter':
      speedMultiplier = 2.5; // Fast
      break;
    case 'helicopter':
      speedMultiplier = 1.2; // Slow
      break;
    case 'glide_bomb':
      speedMultiplier = 2.8; // Very fast
      break;
    // Special threat types
    case 'stealth':
      speedMultiplier = 0.8;
      special = { isStealthed: false, stealthTimer: 3000 };
      break;
    case 'armored':
      speedMultiplier = 0.4; // Very slow
      break;
    case 'swarm':
      speedMultiplier = 0.6;
      special = { swarmUnits: 5 };
      break;
    case 'decoy':
      speedMultiplier = 0.7;
      special = { isDecoy: true };
      break;
    case 'emp':
      speedMultiplier = 1.0;
      special = { empRadius: 100 };
      break;
    case 'splitter':
      speedMultiplier = 0.8;
      special = { hasSplit: false };
      break;
    default:
      speedMultiplier = getGameConfig().DRONE_SPEED;
  }
  
  return {
    id,
    type,
    x: startX,
    y: startY,
    startX,
    startY,
    targetX,
    targetY,
    targetCityId: targetCity.id,
    speed: speedMultiplier,
    health,
    maxHealth: health,
    angle: Math.atan2(targetY - startY, targetX - startX),
    progress: 0,
    zigzagOffset: 0,
    zigzagPhase: Math.random() * Math.PI * 2,
    trailPositions: [],
    isDetected: false,
    originName: spawnLocation?.name,
    spawnedAt: Date.now(),
    willFallInEnemyTerritory: Math.random() < 0.2,
    special,
  };
}

export function createBattery(type: BatteryType, x: number, y: number): Battery {
  const id = `battery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  let config: { range: number; [key: string]: unknown };
  let targetTypes: ThreatType[] | undefined;
  
  switch (type) {
    case 'shortRange':
      config = getGameConfig().SHORT_RANGE;
      targetTypes = ['rocket', 'drone'];
      break;
    case 'mediumRange':
      config = getGameConfig().MEDIUM_RANGE;
      targetTypes = ['cruise', 'drone', 'helicopter', 'fighter'];
      break;
    case 'longRange':
      config = getGameConfig().LONG_RANGE;
      targetTypes = ['drone', 'cruise', 'ballistic', 'fighter', 'helicopter', 'glide_bomb', 'stealth', 'armored', 'splitter'];
      break;
    case 'laser':
      config = getGameConfig().LASER;
      break;
    case 'thaad':
      config = getGameConfig().THAAD;
      targetTypes = ['drone', 'cruise', 'ballistic', 'fighter', 'helicopter', 'glide_bomb', 'stealth', 'armored', 'splitter'];
      break;
    case 'david':
      config = getGameConfig().DAVID;
      targetTypes = ['drone', 'cruise', 'ballistic', 'fighter', 'helicopter', 'glide_bomb', 'stealth', 'armored', 'splitter'];
      break;
    case 'arrow2':
      config = getGameConfig().ARROW2;
      targetTypes = ['drone', 'cruise', 'ballistic', 'fighter', 'helicopter', 'glide_bomb', 'stealth', 'armored', 'splitter'];
      break;
  }
  
  const perBatteryAmmo = type === 'thaad' ? (getGameConfig().THAAD?.maxAmmo ?? 20) : type === 'david' ? (getGameConfig().DAVID?.maxAmmo ?? 8) : type === 'arrow2' ? (getGameConfig().ARROW2?.maxAmmo ?? 4) : 0;
  return {
    id,
    type,
    x,
    y,
    ammo: type === 'laser' ? Infinity : perBatteryAmmo,
    maxAmmo: type === 'laser' ? Infinity : perBatteryAmmo,
    range: config.range,
    isReloading: false,
    reloadProgress: 0,
    targetThreatId: null,
    lastFiredAt: 0,
    heatLevel: 0,
    isOverheated: false,
    cooldownProgress: 0,
    isActive: false,
    targetTypes,
  };
}

export function createProjectile(
  battery: Battery,
  threat: Threat
): Projectile {
  const id = `projectile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  let speed: number;
  switch (battery.type) {
    case 'shortRange': speed = getGameConfig().SHORT_RANGE.projectileSpeed; break;
    case 'mediumRange': speed = getGameConfig().MEDIUM_RANGE.projectileSpeed; break;
    case 'longRange': speed = getGameConfig().LONG_RANGE.projectileSpeed; break;
    case 'thaad': speed = getGameConfig().THAAD?.projectileSpeed ?? 12; break;
    case 'david': speed = getGameConfig().DAVID?.projectileSpeed ?? 11; break;
    case 'arrow2': speed = getGameConfig().ARROW2?.projectileSpeed ?? 9; break;
    default: speed = getGameConfig().SHORT_RANGE.projectileSpeed;
  }
  
  return {
    id,
    batteryId: battery.id,
    x: battery.x,
    y: battery.y,
    targetX: threat.x,
    targetY: threat.y,
    targetThreatId: threat.id,
    speed,
    angle: Math.atan2(threat.y - battery.y, threat.x - battery.x),
    trailPositions: [],
  };
}

export function createExplosion(x: number, y: number, isLarge: boolean = false): Explosion {
  const id = `explosion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const particleCount = isLarge ? 15 : 10;
  const particles: Particle[] = [];
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3,
      alpha: 1,
      color: Math.random() > 0.5 ? COLORS.explosion : COLORS.explosionCore,
    });
  }
  
  return {
    id,
    x,
    y,
    radius: 0,
    maxRadius: isLarge ? 40 : 25,
    alpha: 1,
    particles,
  };
}

export function createInitialGameState(): GameState {
  return {
    phase: 'menu',
    budget: getGameConfig().STARTING_BUDGET,
    morale: getGameConfig().STARTING_MORALE,
    score: 0,
    wave: 0,
    isEndless: false,
    
    cities: [],
    threats: [],
    batteries: [],
    projectiles: [],
    explosions: [],
    laserBeams: [],
    radars: [],
    
    selectedBatteryId: null,
    placingBatteryType: null,
    placingRadarType: null,
    previewPosition: null,
    
    upgrades: {
      reloadSpeed: 0,
      radarRange: 0,
      maxAmmo: 0,
    },
    laserUnlocked: false,
    ammoPool: { shortRange: 10, mediumRange: 2, longRange: 0 },
    
    stats: {
      totalInterceptions: 0,
      totalMissed: 0,
      totalWavesCompleted: 0,
      highScore: 0,
    },
    
    notifications: [],
    cityHitLog: [],
    enemyTerritoryFallLog: [],
    screenShake: 0,
    fullCoverageRemaining: 0,
    alliedSupportUsed: false,
  };
}

export function getThreatColor(type: ThreatType): string {
  switch (type) {
    case 'drone': return COLORS.drone;
    case 'rocket': return 'hsl(25, 100%, 55%)';
    case 'ballistic': return COLORS.ballistic;
    case 'cruise': return COLORS.cruise;
    case 'fighter': return 'hsl(280, 100%, 60%)'; // Purple for fighter jets
    case 'helicopter': return 'hsl(160, 100%, 50%)'; // Teal for helicopters
    case 'glide_bomb': return 'hsl(340, 100%, 55%)'; // Pink for glide bombs
    // Special threats
    case 'stealth': return 'hsl(200, 80%, 50%)'; // Cyan, semi-transparent
    case 'armored': return 'hsl(220, 20%, 70%)'; // Silver metallic
    case 'swarm': return 'hsl(45, 100%, 55%)'; // Golden yellow
    case 'decoy': return 'hsl(0, 0%, 60%)'; // Gray dashed
    case 'emp': return 'hsl(240, 100%, 65%)'; // Electric blue
    case 'splitter': return 'hsl(290, 80%, 55%)'; // Purple
    default: return COLORS.drone;
  }
}

export function getThreatName(type: ThreatType): string {
  switch (type) {
    case 'drone': return 'כטב"ם';
    case 'rocket': return 'טיל רגיל';
    case 'ballistic': return 'טיל בליסטי';
    case 'cruise': return 'טיל שיוט';
    case 'fighter': return 'מטוס קרב';
    case 'helicopter': return 'מסוק קרב';
    case 'glide_bomb': return 'פצצה מתחלקת';
    // Special threats
    case 'stealth': return 'מל"ט חמקני';
    case 'armored': return 'טיל משוריין';
    case 'swarm': return 'נחיל מל"טים';
    case 'decoy': return 'פיתיון';
    case 'emp': return 'טיל EMP';
    case 'splitter': return 'מתפצל';
    default: return 'איום';
  }
}

export function getThreatIcon(type: ThreatType): string {
  switch (type) {
    case 'drone': return '✈';
    case 'rocket': return '➤';
    case 'ballistic': return '🚀';
    case 'cruise': return '➤';
    case 'fighter': return '✦';
    case 'helicopter': return '🚁';
    case 'glide_bomb': return '💣';
    // Special threats
    case 'stealth': return '👻';
    case 'armored': return '🛡️';
    case 'swarm': return '🐝';
    case 'decoy': return '🎭';
    case 'emp': return '⚡';
    case 'splitter': return '💥';
    default: return '•';
  }
}

export function getBatteryColor(type: BatteryType): string {
  switch (type) {
    case 'shortRange': return COLORS.shortRange;
    case 'mediumRange': return COLORS.mediumRange;
    case 'longRange': return COLORS.longRange;
    case 'laser': return COLORS.laser;
    case 'thaad': return 'hsl(220, 70%, 55%)';
    case 'david': return 'hsl(45, 90%, 50%)';
    case 'arrow2': return 'hsl(270, 80%, 55%)';
  }
}

export function getBatteryCost(type: BatteryType): number {
  switch (type) {
    case 'shortRange': return getGameConfig().SHORT_RANGE_COST;
    case 'mediumRange': return getGameConfig().MEDIUM_RANGE_COST;
    case 'longRange': return getGameConfig().LONG_RANGE_COST;
    case 'laser': return getGameConfig().LASER_COST;
    case 'thaad': return getGameConfig().THAAD_COST;
    case 'david': return getGameConfig().DAVID_COST;
    case 'arrow2': return getGameConfig().ARROW2_COST;
  }
}

export function getReloadCost(type: BatteryType): number {
  switch (type) {
    case 'shortRange': return getGameConfig().SHORT_RANGE_RELOAD_COST;
    case 'mediumRange': return getGameConfig().MEDIUM_RANGE_RELOAD_COST;
    case 'longRange': return getGameConfig().LONG_RANGE_RELOAD_COST;
    case 'laser': return 0; // Laser doesn't need reload
    case 'thaad': return getGameConfig().THAAD_RELOAD_COST ?? 200;
    case 'david': return getGameConfig().DAVID_RELOAD_COST ?? 95;
    case 'arrow2': return getGameConfig().ARROW2_RELOAD_COST ?? 85;
  }
}

/** Morale damage when this threat type hits a city (stronger/advanced = more damage). */
export function getMoraleDamageForThreat(type: ThreatType): number {
  const map = getGameConfig().MORALE_DAMAGE_BY_THREAT as Record<string, number> | undefined;
  if (map && map[type] != null) return map[type];
  return getGameConfig().CITY_HIT_MORALE_DAMAGE;
}

export function getThreatReward(type: ThreatType): number {
  switch (type) {
    case 'drone': return getGameConfig().DRONE_REWARD;
    case 'rocket': return 75; // >= SHORT_RANGE_RELOAD_COST (70)
    case 'ballistic': return getGameConfig().BALLISTIC_REWARD;
    case 'cruise': return getGameConfig().CRUISE_REWARD;
    case 'fighter': return 200;
    case 'helicopter': return 120;
    case 'glide_bomb': return 180;
    // Special threats - higher rewards
    case 'stealth': return 150;
    case 'armored': return 300;
    case 'swarm': return 80; // Per unit
    case 'decoy': return 20; // Low reward - it's a decoy
    case 'emp': return 250;
    case 'splitter': return 200;
    default: return getGameConfig().DRONE_REWARD;
  }
}

// Naval radar – מגזר לכיוון הים (מערב). כיוון הים = 180° (שמאל במסך)
export const NAVAL_SEA_ANGLE = Math.PI; // west
export const NAVAL_SECTOR_HALF = (32 * Math.PI) / 180; // 64° sector total – מפתח קטן יותר (רדאר ימי)

/** Returns true if (pointX, pointY) is within the naval radar's sea-facing sector (distance and angle). */
export function isInNavalRadarSector(
  radarX: number,
  radarY: number,
  pointX: number,
  pointY: number,
  range: number
): boolean {
  const dx = pointX - radarX;
  const dy = pointY - radarY;
  const distSq = dx * dx + dy * dy;
  if (distSq > range * range) return false;
  const angle = Math.atan2(dy, dx);
  let diff = angle - NAVAL_SEA_ANGLE;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= NAVAL_SECTOR_HALF;
}

/** רדאר רגיל נחשב "ליד הים" אם הוא בצד המערבי של המפה (x קטן). אז גם הוא מזהה במגזר לים. */
export function isRadarBySea(radarX: number, canvasWidth: number): boolean {
  return radarX <= canvasWidth * 0.35;
}

// Radar factory and helpers
export function createRadar(type: RadarType, x: number, y: number): Radar {
  const id = `radar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Radar ranges – at least as large as battery ranges so radar always "sees" what batteries can shoot
  const ranges: Record<RadarType, number> = {
    basic: 55,   // >= shortRange (52)
    advanced: 150, // >= mediumRange (90)
    longRange: 170, // טווח מוקטן; >= longRange (135) and laser (150)
    lband: 140,  // L-band – זיהוי חמקנים במרחק סביר
    naval: 340,  // רדאר ימי – טווח מורחב לכיוון הים (מגזר 64°)
  };
  
  return {
    id,
    type,
    x,
    y,
    range: ranges[type],
    detectedThreats: [],
  };
}

export function getRadarCost(type: RadarType): number {
  switch (type) {
    case 'basic': return 150;
    case 'advanced': return 400;
    case 'longRange': return 800;
    case 'lband': return 550;
    case 'naval': return 480;
  }
}

export function getRadarName(type: RadarType): string {
  switch (type) {
    case 'basic': return 'רדאר בסיסי';
    case 'advanced': return 'רדאר מתקדם';
    case 'longRange': return 'רדאר טווח ארוך';
    case 'lband': return 'L-band (חמקנים)';
    case 'naval': return 'רדאר ימי';
  }
}
