// Multiplayer state snapshot – סריאליזציה והחלפת מצב לאורח

import type {
  GamePhase,
  Battery,
  Threat,
  Projectile,
  Explosion,
  Radar,
  City,
  GameNotification,
  Upgrades,
  LaserBeam,
  CityHitLogEntry,
  EnemyTerritoryFallEntry,
} from './entities';
import type { RandomEvent } from './randomEvents';
import type { ThreatSpawn } from './waves';

export interface WaveSpawnQueueSnapshot {
  spawns: ThreatSpawn[];
  currentIndex: number;
  spawnTimer: number;
  targetCityIds: string[];
}

export interface ComboSnapshot {
  current: number;
  max: number;
  lastInterceptTime: number;
  comboWindow: number;
}

/** Serializable snapshot of game state for Realtime broadcast (host -> guest) */
export interface GameStateSnapshot {
  // From GameState
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
  radars: Radar[];
  selectedBatteryId: string | null;
  placingBatteryType: string | null;
  placingRadarType: string | null;
  previewPosition: { x: number; y: number } | null;
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
  enemyTerritoryFallLog: EnemyTerritoryFallEntry[];
  screenShake: number;
  fullCoverageRemaining: number;
  alliedSupportUsed: boolean;
  // From GameStore (extra)
  waveSpawnQueue: WaveSpawnQueueSnapshot;
  combo: ComboSnapshot;
  waveDamageCount: number;
  consecutiveInterceptions: number;
  canvasWidth: number;
  canvasHeight: number;
  waveCompleteReadyAt: number | null;
  preparationStartedAt: number | null;
  cityHitFlashUntil: number | null;
  waveStartShowUntil: number | null;
  gameMode: 'waves' | 'story';
  storyChapterId: string | null;
  activeEvent: RandomEvent | null;
  activeEventStartedAt: number | null;
  thaadExtraAmmo: number;
}

/** Guest action payloads sent to host over Realtime broadcast */
export type GuestAction =
  | { type: 'placeBattery'; batteryType: string; x: number; y: number }
  | { type: 'placeRadar'; radarType: string; x: number; y: number }
  | { type: 'cancelPlacement' }
  | { type: 'nextWave' }
  | { type: 'startWaveFromPreparation' }
  | { type: 'openShop' }
  | { type: 'setPhase'; phase: string }
  | { type: 'selectBattery'; id: string | null }
  | { type: 'reloadBattery' }
  | { type: 'buyAmmo'; ammoType: 'shortRange' | 'mediumRange' | 'longRange'; amount?: number }
  | { type: 'buyThaadAmmo' }
  | { type: 'purchaseUpgrade'; upgradeType: 'reloadSpeed' | 'radarRange' | 'maxAmmo'; payWithDiamonds?: boolean }
  | { type: 'unlockLaser'; payWithDiamonds?: boolean }
  | { type: 'purchaseMoraleBoost' }
  | { type: 'buyBudgetWithDiamonds'; diamondAmount: number }
  | { type: 'purchaseThaadUpgrade' };
