// Zustand game store - חנות מצב משחק עם Zustand
import { create } from 'zustand';
import {
  GameState,
  GamePhase,
  Battery,
  Threat,
  Projectile,
  Explosion,
  BatteryType,
  AmmoPoolType,
  RadarType,
  Radar,
  City,
  GameNotification,
  Position,
  Upgrades,
  LaserBeam,
  createBattery,
  createRadar,
  createThreat,
  createExplosion,
  createInitialGameState,
  getBatteryCost,
  getRadarCost,
  getReloadCost,
  getThreatReward,
  getMoraleDamageForThreat,
  isInNavalRadarSector,
  isRadarBySea,
} from '@/lib/game/entities';
import { CITY_POSITIONS } from '@/lib/constants';
import { getGameConfig } from '@/lib/game/gameConfigLoader';
import { usePlayerStore } from '@/store/playerStore';
import { getWaveConfig, ThreatSpawn } from '@/lib/game/waves';
import { getStoryWaveConfig, getStoryChapter } from '@/lib/game/storyMode';
import {
  updateThreatPosition,
  updateProjectilePosition,
  checkProjectileHit,
  checkThreatReachedCity,
  updateExplosionImmutable,
  findClosestThreatInRange,
  isValidPlacement,
  PlacementValidation,
  getEffectiveReloadTime,
  getAmmoPoolForUpgrade,
  segmentIntersectsCircle,
  distance,
} from '@/lib/game/physics';
import { getRandomSpawnLocationForThreatType, getSpawnLocationFromSea, getRandomSpawnLocationForOrigin } from '@/lib/game/threatSpawnLocations';
import { pointInIsraelPolygon, pointInEnemyTerritory } from '@/lib/game/israelMap';
import { getInitialCitiesForMap } from '@/lib/game/israelMap';
import { t } from '@/lib/i18n/he';
import { projectilePool, type PooledProjectile } from '@/lib/game/objectPool';
import type { RandomEvent } from '@/lib/game/randomEvents';
import type { GameStateSnapshot } from '@/lib/game/multiplayerSnapshot';

interface WaveSpawnQueue {
  spawns: ThreatSpawn[];
  currentIndex: number;
  spawnTimer: number;
  /** City IDs that may be targeted this wave – fewer in early waves so fewer cities go red */
  targetCityIds: string[];
}

// Combo system state
interface ComboState {
  current: number;
  max: number;
  lastInterceptTime: number;
  comboWindow: number; // ms to maintain combo
}

interface GameStore extends GameState {
  // Wave spawn queue
  waveSpawnQueue: WaveSpawnQueue;
  
  // Combo system
  combo: ComboState;
  
  // Wave damage tracking for achievements
  waveDamageCount: number;
  consecutiveInterceptions: number;
  
  // Canvas dimensions (set on init)
  canvasWidth: number;
  canvasHeight: number;
  
  // Error message for UI
  errorMessage: string | null;
  
  // Wave complete delay: show screen only 2s after last target intercepted
  waveCompleteReadyAt: number | null;
  // Preparation phase: when "הגל הבא" clicked – map visible, place systems; attack starts on button or after PREPARATION_DURATION_MS
  preparationStartedAt: number | null;
  // City hit red flash overlay until this timestamp (ms)
  cityHitFlashUntil: number | null;
  // Wave start overlay: show "Wave N" until this timestamp (ms)
  waveStartShowUntil: number | null;
  // Auto ammo refill disabled – ammo only decreases when firing; user buys in shop (no cap)
  lastAmmoRefillTime: number;
  nextAmmoRefillType: 0 | 1 | 2;
  
  // Story mode
  gameMode: 'waves' | 'story';
  storyChapterId: string | null;
  
  // Random event (e.g. satellite support – radar +30%) – applied in update until duration expires
  activeEvent: RandomEvent | null;
  activeEventStartedAt: number | null;
  /** THAAD upgrade: +5 max ammo for this game (purchased in shop with diamonds) */
  thaadExtraAmmo: number;
  
  // Actions
  setActiveEvent: (event: RandomEvent | null) => void;
  setCanvasDimensions: (width: number, height: number) => void;
  startGame: (initialCities?: City[]) => void;
  startStoryGame: (chapterId: string, initialCities?: City[]) => void;
  startWave: (waveNumber: number) => void;
  addNotification: (message: string, type: GameNotification['type'], duration?: number) => void;
  removeNotification: (id: string) => void;
  selectBattery: (id: string | null) => void;
  startPlacingBattery: (type: BatteryType) => void;
  placeBattery: (x: number, y: number) => void;
  startPlacingRadar: (type: RadarType) => void;
  placeRadar: (x: number, y: number) => void;
  cancelPlacement: () => void;
  reloadBattery: () => void;
  /** Refill all THAAD batteries to max for THAAD_RELOAD_COST; in-game shop */
  buyThaadAmmo: () => void;
  /** Purchase THAAD +5 ammo upgrade (diamonds); once per game */
  purchaseThaadUpgrade: () => boolean;
  buyAmmo: (type: AmmoPoolType, amount?: number) => void;
  updatePreviewPosition: (x: number, y: number) => void;
  purchaseUpgrade: (upgradeType: 'reloadSpeed' | 'radarRange' | 'maxAmmo', payWithDiamonds?: boolean) => void;
  unlockLaser: (payWithDiamonds?: boolean) => void;
  purchaseMoraleBoost: () => void;
  buyBudgetWithDiamonds: (diamondAmount: number) => void;
  nextWave: () => void;
  /** End preparation phase and start the wave (threats begin spawning). */
  startWaveFromPreparation: () => void;
  openShop: () => void;
  setPhase: (phase: GamePhase) => void;
  /** Activate full coverage buff (from main menu shop) – consumes from player store */
  activateFullCoverage: (seconds: number) => void;
  /** Add morale buff (from main menu shop) – consumes from player store */
  addMorale: (amount: number) => void;
  /** From wave 8: request allied support (e.g. THAAD) – one-time full coverage boost */
  requestAlliedSupport: () => void;
  /** Save current game to localStorage and return to menu */
  saveGameAndExit: () => void;
  /** Restore game from localStorage; returns true if restored */
  resumeGame: () => boolean;
  exitStoryToMenu: () => void;
  update: (deltaTime: number, currentTime: number) => void;
  initializeCities: (width: number, height: number) => void;
  clearError: () => void;
  /** Multiplayer: build serializable snapshot for broadcast (host). */
  getSerializableStateSnapshot: () => GameStateSnapshot;
  /** Multiplayer: replace state from host snapshot (guest). */
  replaceStateFromHost: (snapshot: GameStateSnapshot) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state from createInitialGameState
  ...createInitialGameState(),
  
  // Wave spawn queue
  waveSpawnQueue: {
    spawns: [],
    currentIndex: 0,
    spawnTimer: 0,
    targetCityIds: [],
  },
  
  waveCompleteReadyAt: null as number | null,
  preparationStartedAt: null as number | null,
  cityHitFlashUntil: null as number | null,
  waveStartShowUntil: null as number | null,
  lastAmmoRefillTime: 0,
  nextAmmoRefillType: 0,
  gameMode: 'waves',
  storyChapterId: null,
  activeEvent: null as RandomEvent | null,
  activeEventStartedAt: null as number | null,
  thaadExtraAmmo: 0,
  
  // Combo system
  combo: {
    current: 0,
    max: 0,
    lastInterceptTime: 0,
    comboWindow: 3000, // 3 seconds default
  },
  
  // Wave tracking for achievements
  waveDamageCount: 0,
  consecutiveInterceptions: 0,
  
  // Canvas dimensions
  canvasWidth: getGameConfig().CANVAS_WIDTH,
  canvasHeight: getGameConfig().CANVAS_HEIGHT,
  
  // Error message
  errorMessage: null,
  
  // Actions
  setCanvasDimensions: (width, height) => set({ canvasWidth: width, canvasHeight: height }),
  
  initializeCities: (width, height) => {
    const cities: City[] = CITY_POSITIONS.map(pos => ({
      id: pos.id,
      name: pos.name,
      x: pos.x * width,
      y: pos.y * height,
      isTargeted: false,
      pulsePhase: Math.random() * Math.PI * 2,
    }));
    set({ cities });
  },
  
  startGame: (initialCities?: City[]) => {
    try {
      localStorage.removeItem('sky_shield_saved_game');
    } catch {
      // ignore localStorage errors
    }
    const { canvasWidth, canvasHeight, stats } = get();
    const difficulty = usePlayerStore.getState().difficulty ?? 'normal';
    const baseBudget = getGameConfig().STARTING_BUDGET;
    const baseMorale = getGameConfig().STARTING_MORALE;
    const budgetMult = difficulty === 'easy' ? 1.3 : difficulty === 'hard' ? 0.7 : 1;
    const moraleMult = difficulty === 'easy' ? 1.2 : difficulty === 'hard' ? 0.8 : 1;
    const startBudget = Math.round(baseBudget * budgetMult);
    const startMorale = Math.min(100, Math.round(baseMorale * moraleMult));
    
    const cities: City[] = initialCities ?? CITY_POSITIONS.map(pos => ({
      id: pos.id,
      name: pos.name,
      x: pos.x * canvasWidth,
      y: pos.y * canvasHeight,
      isTargeted: false,
      pulsePhase: Math.random() * Math.PI * 2,
    }));
    
    projectilePool.clear();
    const initialState = createInitialGameState();
    const ammoForStart = getAmmoPoolForUpgrade(initialState.upgrades.maxAmmo);

    set({
      ...initialState,
      budget: startBudget,
      morale: startMorale,
      phase: 'playing',
      wave: 1,
      cities,
      ammoPool: ammoForStart,
      canvasWidth,
      canvasHeight,
      gameMode: 'waves',
      storyChapterId: null,
      cityHitFlashUntil: null,
      waveStartShowUntil: null,
      activeEvent: null,
      activeEventStartedAt: null,
      thaadExtraAmmo: 0,
      combo: {
        current: 0,
        max: 0,
        lastInterceptTime: 0,
        comboWindow: 3000,
      },
      waveDamageCount: 0,
      consecutiveInterceptions: 0,
      stats: {
        ...createInitialGameState().stats,
        highScore: stats.highScore,
      },
    });
    
    get().startWave(1);
  },
  
  startStoryGame: (chapterId, initialCities) => {
    const { canvasWidth, canvasHeight, stats } = get();
    const cities = initialCities ?? getInitialCitiesForMap(canvasWidth, canvasHeight);
    const chapter = getStoryChapter(chapterId);
    const storyBudget = chapter?.startingBudget ?? getGameConfig().STORY_MODE_STARTING_BUDGET;
    const initialState = createInitialGameState();
    const ammoForStart = getAmmoPoolForUpgrade(initialState.upgrades.maxAmmo);

    // Buffs from main menu shop are NOT applied at start – player chooses when to use them in-game

    set({
      ...initialState,
      budget: storyBudget,
      phase: 'playing',
      wave: 1,
      cities,
      ammoPool: ammoForStart,
      canvasWidth,
      canvasHeight,
      gameMode: 'story',
      storyChapterId: chapterId,
      cityHitFlashUntil: null,
      waveStartShowUntil: null,
      activeEvent: null,
      activeEventStartedAt: null,
      thaadExtraAmmo: 0,
      combo: {
        current: 0,
        max: 0,
        lastInterceptTime: 0,
        comboWindow: 3000,
      },
      waveDamageCount: 0,
      consecutiveInterceptions: 0,
      stats: {
        ...createInitialGameState().stats,
        highScore: stats.highScore,
      },
    });
    get().startWave(1);
  },

  startWave: (waveNumber) => {
    // Ammo pool is intentionally NOT reset here – it persists between waves.
    const { cities, gameMode, storyChapterId } = get();
    const storyConfig = (gameMode === 'story' && storyChapterId) ? getStoryWaveConfig(storyChapterId, waveNumber - 1) : null;
    const config = storyConfig ?? getWaveConfig(waveNumber);
    const maxTargetedCities = waveNumber <= 2 ? 1 : waveNumber <= 4 ? 2 : waveNumber <= 6 ? 3 : cities.length;
    const shuffled = [...cities].sort(() => Math.random() - 0.5);
    const targetCityIds = shuffled.slice(0, maxTargetedCities).map(c => c.id);
    set({
      waveSpawnQueue: {
        spawns: config.threats.flatMap(t =>
          Array(t.count).fill({ ...t, count: 1 })
        ),
        currentIndex: 0,
        spawnTimer: 0,
        targetCityIds,
      },
    });
  },

  addNotification: (message, type, duration) => {
    const notification: GameNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      message,
      type,
      timestamp: Date.now(),
      duration,
    };
    set(state => ({
      notifications: [...state.notifications, notification].slice(-5),
    }));
  },
  
  removeNotification: (id) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id),
    }));
  },
  
  selectBattery: (id) => {
    set({
      selectedBatteryId: id,
      placingBatteryType: null,
    });
  },
  
  startPlacingBattery: (type) => {
    const { budget, laserUnlocked, addNotification } = get();
    const cost = getBatteryCost(type);
    
    if (budget < cost) {
      addNotification('תקציב לא מספיק!', 'warning');
      return;
    }
    if (type === 'laser' && !laserUnlocked) {
      addNotification('לייזר עדיין נעול!', 'warning');
      return;
    }
    
    set({
      placingBatteryType: type,
      selectedBatteryId: null,
    });
  },
  
  placeBattery: (x, y) => {
    const { placingBatteryType, batteries, cities, canvasWidth, canvasHeight, budget, thaadExtraAmmo, addNotification } = get();
    
    if (!placingBatteryType) return;
    
    let battery = createBattery(placingBatteryType, x, y);
    if (placingBatteryType === 'thaad' && thaadExtraAmmo > 0) {
      const baseMax = getGameConfig().THAAD?.maxAmmo ?? 20;
      const newMax = baseMax + thaadExtraAmmo;
      battery = { ...battery, ammo: newMax, maxAmmo: newMax };
    }
    const validation = isValidPlacement(x, y, batteries, cities, canvasWidth, canvasHeight, battery.range);
    
    if (!validation.isValid) {
      const msg = validation.reason || 'מיקום לא תקין – בחר נקודה בתוך ישראל, לא קרוב מדי לסוללה או לעיר';
      addNotification(msg, 'warning', 3500);
      set({ errorMessage: msg });
      return;
    }
    
    const cost = getBatteryCost(placingBatteryType);
    
    set({
      budget: budget - cost,
      batteries: [...batteries, battery],
      placingBatteryType: null,
      errorMessage: null,
    });
  },
  
  clearError: () => set({ errorMessage: null }),
  
  startPlacingRadar: (type) => {
    const { budget, addNotification } = get();
    const cost = getRadarCost(type);
    
    if (budget < cost) {
      addNotification('תקציב לא מספיק!', 'warning');
      return;
    }
    
    set({
      placingRadarType: type,
      placingBatteryType: null,
      selectedBatteryId: null,
    });
  },
  
  placeRadar: (x, y) => {
    const { placingRadarType, radars, canvasWidth, canvasHeight, budget, addNotification } = get();
    
    if (!placingRadarType) return;
    
    if (x < 30 || x > canvasWidth - 30 || y < 30 || y > canvasHeight - 30) {
      addNotification('מחוץ לגבולות המפה – בחר נקודה בתוך המפה', 'warning', 3500);
      return;
    }
    
    if (!pointInIsraelPolygon(x, y, canvasWidth, canvasHeight)) {
      addNotification('ניתן לפרוס רק בשטח ישראל – בחר נקודה בתוך הגבול', 'warning', 3500);
      return;
    }
    
    const cost = getRadarCost(placingRadarType);
    const radar = createRadar(placingRadarType, x, y);
    
    set({
      budget: budget - cost,
      radars: [...radars, radar],
      placingRadarType: null,
    });
  },
  
  cancelPlacement: () => {
    set({
      placingBatteryType: null,
      placingRadarType: null,
    });
  },
  
  buyAmmo: (type, amount = 1) => {
    const { budget, ammoPool, addNotification } = get();
    const costPerUnit = getReloadCost(type);
    const maxByBudget = costPerUnit > 0 ? Math.floor(budget / costPerUnit) : amount;
    const amountToAdd = Math.min(amount, maxByBudget);
    if (amountToAdd <= 0) {
      addNotification('תקציב לא מספיק!', 'warning');
      return;
    }
    const cost = costPerUnit * amountToAdd;
    set({
      budget: budget - cost,
      ammoPool: {
        ...ammoPool,
        [type]: ammoPool[type] + amountToAdd,
      },
    });
  },
  
  reloadBattery: () => {
    const { selectedBatteryId, batteries, budget, addNotification } = get();
    const selected = selectedBatteryId ? batteries.find(b => b.id === selectedBatteryId) : null;
    if (selected?.type === 'thaad') {
      const cost = getGameConfig().THAAD_RELOAD_COST ?? 200;
      if (budget < cost) {
        addNotification('תקציב לא מספיק!', 'warning');
        return;
      }
      const maxAmmo = getGameConfig().THAAD?.maxAmmo ?? 20;
      if ((selected.ammo ?? 0) >= (selected.maxAmmo ?? maxAmmo)) {
        addNotification('THAAD כבר מלא', 'info');
        return;
      }
      set({
        budget: budget - cost,
        batteries: batteries.map(b =>
          b.id === selectedBatteryId
            ? { ...b, ammo: b.maxAmmo ?? maxAmmo }
            : b
        ),
      });
      addNotification('THAAD טעון מחדש', 'success');
      return;
    }
    if (selected?.type === 'david') {
      const cost = getGameConfig().DAVID_RELOAD_COST ?? 95;
      if (budget < cost) {
        addNotification('תקציב לא מספיק!', 'warning');
        return;
      }
      const maxAmmo = getGameConfig().DAVID?.maxAmmo ?? 8;
      if ((selected.ammo ?? 0) >= (selected.maxAmmo ?? maxAmmo)) {
        addNotification('דוד כבר מלא', 'info');
        return;
      }
      set({
        budget: budget - cost,
        batteries: batteries.map(b =>
          b.id === selectedBatteryId
            ? { ...b, ammo: b.maxAmmo ?? maxAmmo }
            : b
        ),
      });
      addNotification('דוד טעון מחדש', 'success');
      return;
    }
    if (selected?.type === 'arrow2') {
      const cost = getGameConfig().ARROW2_RELOAD_COST ?? 85;
      if (budget < cost) {
        addNotification('תקציב לא מספיק!', 'warning');
        return;
      }
      const maxAmmo = getGameConfig().ARROW2?.maxAmmo ?? 4;
      if ((selected.ammo ?? 0) >= (selected.maxAmmo ?? maxAmmo)) {
        addNotification('חץ 2 כבר מלא', 'info');
        return;
      }
      set({
        budget: budget - cost,
        batteries: batteries.map(b =>
          b.id === selectedBatteryId
            ? { ...b, ammo: b.maxAmmo ?? maxAmmo }
            : b
        ),
      });
      addNotification('חץ 2 טעון מחדש', 'success');
      return;
    }
    get().openShop();
  },

  buyThaadAmmo: () => {
    const { batteries, budget, addNotification } = get();
    const thaadBatteries = batteries.filter(b => b.type === 'thaad');
    if (thaadBatteries.length === 0) {
      addNotification('אין סוללות THAAD', 'info');
      return;
    }
    const maxAmmo = getGameConfig().THAAD?.maxAmmo ?? 20;
    const allFull = thaadBatteries.every(b => (b.ammo ?? 0) >= (b.maxAmmo ?? maxAmmo));
    if (allFull) {
      addNotification('כל סוללות THAAD כבר מלאות', 'info');
      return;
    }
    const cost = getGameConfig().THAAD_RELOAD_COST ?? 200;
    if (budget < cost) {
      addNotification('תקציב לא מספיק!', 'warning');
      return;
    }
    set({
      budget: budget - cost,
      batteries: batteries.map(b =>
        b.type === 'thaad' ? { ...b, ammo: maxAmmo } : b
      ),
    });
    addNotification(`תחמושת THAAD – כל הסוללות מולאו ל־${maxAmmo} טילים`, 'success');
  },

  purchaseThaadUpgrade: () => {
    const { thaadExtraAmmo } = get();
    if (thaadExtraAmmo > 0) return false;
    const costDiamonds = 5;
    if (!usePlayerStore.getState().spendDiamonds(costDiamonds)) return false;
    set({ thaadExtraAmmo: 5 });
    get().addNotification('שדרוג THAAD – +5 טילים לסוללות חדשות', 'success');
    return true;
  },

  updatePreviewPosition: (x, y) => {
    set({ previewPosition: { x, y } });
  },
  
  purchaseUpgrade: (upgradeType, _payWithDiamonds = true) => {
    const { upgrades, ammoPool, addNotification } = get();
    const currentLevel = upgrades[upgradeType];
    if (currentLevel >= 4) return;
    const cost = getGameConfig().UPGRADE_COSTS[upgradeType][currentLevel];
    const costDiamonds = Math.ceil(cost / getGameConfig().DIAMOND_TO_BUDGET_RATIO);
    if (usePlayerStore.getState().spendDiamonds(costDiamonds)) {
      const nextUpgrades = { ...upgrades, [upgradeType]: currentLevel + 1 };
      // maxAmmo upgrade: immediate +2 to each ammo type in current game
      const ammoBonus = upgradeType === 'maxAmmo' ? getGameConfig().UPGRADE_BONUSES.maxAmmo : 0;
      const nextAmmoPool = ammoBonus > 0
        ? { shortRange: ammoPool.shortRange + ammoBonus, mediumRange: ammoPool.mediumRange + ammoBonus, longRange: ammoPool.longRange + ammoBonus }
        : ammoPool;
      set({
        upgrades: nextUpgrades,
        ...(ammoBonus > 0 ? { ammoPool: nextAmmoPool } : {}),
      });
      return;
    }
    addNotification('אין מספיק יהלומים!', 'warning');
  },
  
  unlockLaser: (_payWithDiamonds = true) => {
    const { laserUnlocked, wave, addNotification } = get();
    if (laserUnlocked) return;
    if (wave < getGameConfig().LASER_UNLOCK_WAVE) {
      addNotification('לייזר נפתח רק מגל 5!', 'warning');
      return;
    }
    const costDiamonds = Math.ceil(getGameConfig().LASER_COST / getGameConfig().DIAMOND_TO_BUDGET_RATIO);
    if (usePlayerStore.getState().spendDiamonds(costDiamonds)) {
      addNotification(t('laserUnlocked'), 'success');
      set({ laserUnlocked: true });
      return;
    }
    addNotification('אין מספיק יהלומים!', 'warning');
  },

  purchaseMoraleBoost: () => {
    const { morale, addNotification } = get();
    const cost = getGameConfig().MORALE_BOOST_COST_DIAMONDS ?? 3;
    const amount = getGameConfig().MORALE_BOOST_AMOUNT ?? 15;
    if (morale >= 100) {
      addNotification('המורל כבר מקסימלי!', 'info');
      return;
    }
    if (!usePlayerStore.getState().spendDiamonds(cost)) {
      addNotification('אין מספיק יהלומים!', 'warning');
      return;
    }
    set({ morale: Math.min(100, morale + amount) });
    addNotification('מורל שוחזר! +' + amount, 'success');
  },

  buyBudgetWithDiamonds: (diamondAmount) => {
    const { budget, addNotification } = get();
    const perDiamond = getGameConfig().BUDGET_PER_DIAMOND ?? 200;
    if (diamondAmount <= 0) return;
    if (!usePlayerStore.getState().spendDiamonds(diamondAmount)) {
      addNotification('אין מספיק יהלומים!', 'warning');
      return;
    }
    const added = diamondAmount * perDiamond;
    set({ budget: budget + added });
    addNotification('תקציב +₪' + added.toLocaleString(), 'success');
  },

  nextWave: () => {
    const { wave, laserUnlocked, addNotification, startWave } = get();
    const nextWaveNum = wave + 1;
    const isEndless = nextWaveNum > 10;
    const unlockLaser = nextWaveNum === getGameConfig().LASER_UNLOCK_WAVE && !laserUnlocked;
    
    if (unlockLaser) addNotification('לייזר זמין בחנות!', 'success');
    
    const now = Date.now();
    set({
      phase: 'preparation',
      wave: nextWaveNum,
      isEndless,
      preparationStartedAt: now,
      waveStartShowUntil: null,
      threats: [],
      projectiles: [],
      explosions: [],
      laserBeams: [],
      ...(unlockLaser ? { laserUnlocked: true } : {}),
    });
    
    startWave(nextWaveNum);
  },

  startWaveFromPreparation: () => {
    const { wave } = get();
    set({
      phase: 'playing',
      preparationStartedAt: null,
      waveStartShowUntil: Date.now() + 2200,
    });
  },
  
  openShop: () => {
    set({ phase: 'shop' });
  },
  
  setPhase: (phase) => {
    set({ phase });
  },

  activateFullCoverage: (seconds) => {
    const consumed = usePlayerStore.getState().consumeFullCoverageSeconds(seconds);
    if (consumed) {
      set(s => ({ fullCoverageRemaining: s.fullCoverageRemaining + seconds }));
      get().addNotification(`כיסוי מלא פעיל ${seconds} שניות`, 'success', 2500);
    }
  },

  addMorale: (amount) => {
    const consumed = usePlayerStore.getState().consumeExtraMorale(amount);
    if (consumed) {
      set(s => ({ morale: s.morale + amount }));
      get().addNotification(`+${amount} מורל`, 'success', 2000);
    }
  },

  requestAlliedSupport: () => {
    const { wave, alliedSupportUsed } = get();
    if (wave < 8 || alliedSupportUsed) return;
    const ALLIED_SUPPORT_SECONDS = 30;
    set(s => ({
      alliedSupportUsed: true,
      fullCoverageRemaining: s.fullCoverageRemaining + ALLIED_SUPPORT_SECONDS,
    }));
    get().addNotification('סיוע THAAD (ארה"ב) – כיסוי משופר 30 שניות', 'success', 3500);
  },

  saveGameAndExit: () => {
    const state = get();
    if (state.phase !== 'playing' && state.phase !== 'preparation') return;
    const payload = {
      version: 1,
      wave: state.wave,
      isEndless: state.isEndless,
      budget: state.budget,
      morale: state.morale,
      score: state.score,
      cities: state.cities,
      batteries: state.batteries,
      radars: state.radars,
      ammoPool: state.ammoPool,
      upgrades: state.upgrades,
      laserUnlocked: state.laserUnlocked,
      combo: state.combo,
      fullCoverageRemaining: state.fullCoverageRemaining,
      gameMode: state.gameMode,
      storyChapterId: state.storyChapterId,
      stats: state.stats,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
    };
    try {
      localStorage.setItem('sky_shield_saved_game', JSON.stringify(payload));
    } catch {
      // ignore localStorage errors
    }
    projectilePool.clear();
    set({
      phase: 'menu',
      threats: [],
      explosions: [],
      waveSpawnQueue: { spawns: [], currentIndex: 0, spawnTimer: 0, targetCityIds: [] },
    });
    get().addNotification('המשחק נשמר. ניתן להמשיך מהתפריט.', 'success', 3000);
  },

  resumeGame: () => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem('sky_shield_saved_game');
    } catch {
      // ignore localStorage errors
    }
    if (!raw) return false;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw);
    } catch (_) {
      return false;
    }
    if (payload.version !== 1 || !payload.wave || !Array.isArray(payload.cities)) return false;
    const wave = Math.max(1, Math.floor(Number(payload.wave)));
    const rawCities = payload.cities as unknown[];
    const cities: City[] = rawCities
      .filter((c): c is Record<string, unknown> => c != null && typeof c === 'object')
      .map(c => ({
        id: String(c.id ?? ''),
        name: String(c.name ?? ''),
        x: Number(c.x) || 0,
        y: Number(c.y) || 0,
        isTargeted: Boolean(c.isTargeted),
        pulsePhase: Number(c.pulsePhase) || 0,
      }))
      .filter(c => c.id != null && c.id !== '');
    if (cities.length === 0) return false;
    projectilePool.clear();
    set({
      phase: 'playing',
      wave,
      isEndless: payload.isEndless ?? false,
      budget: payload.budget ?? 0,
      morale: payload.morale ?? 100,
      score: payload.score ?? 0,
      cities,
      batteries: (payload.batteries ?? []) as Battery[],
      radars: (payload.radars ?? []) as Radar[],
      ammoPool: (payload.ammoPool ?? { shortRange: 0, mediumRange: 0, longRange: 0 }) as GameState['ammoPool'],
      upgrades: (payload.upgrades ?? { reloadSpeed: 0, radarRange: 0, maxAmmo: 0 }) as Upgrades,
      laserUnlocked: !!payload.laserUnlocked,
      combo: (payload.combo ?? { current: 0, max: 0, lastInterceptTime: 0, comboWindow: 3000 }) as ComboState,
      fullCoverageRemaining: Number(payload.fullCoverageRemaining) || 0,
      gameMode: (payload.gameMode ?? 'waves') as 'waves' | 'story',
      storyChapterId: (payload.storyChapterId ?? null) as string | null,
      stats: (payload.stats ?? get().stats) as GameState['stats'],
      canvasWidth: Number(payload.canvasWidth) || getGameConfig().CANVAS_WIDTH,
      canvasHeight: Number(payload.canvasHeight) || getGameConfig().CANVAS_HEIGHT,
      threats: [],
      explosions: [],
      waveStartShowUntil: Date.now() + 1800,
    });
    get().startWave(wave);
    // אל תמחק את השמירה כאן – נמחק רק ב־startGame (משחק חדש), כדי שהמשך משחק יעבוד
    get().addNotification('המשחק חודש', 'success', 2000);
    return true;
  },

  exitStoryToMenu: () => {
    set({ phase: 'menu', gameMode: 'waves', storyChapterId: null });
  },

  setActiveEvent: (event) => {
    set({
      activeEvent: event,
      activeEventStartedAt: event ? Date.now() : null,
    });
  },

  update: (deltaTime, currentTime) => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (state.morale <= 0) {
      if (usePlayerStore.getState().godMode) {
        set({ morale: 1 });
      } else {
        set({ phase: 'gameOver' as GamePhase });
        return;
      }
    }
    const now = Date.now();
    // deltaTime is in frame units (1 ≈ one frame at 60fps). Use deltaMs for time-in-ms logic (laser heat, full coverage, spawn timer).
    const deltaMs = deltaTime * (1000 / 60);
    // 1.0 = גילוי בדיוק כשהמטרה נכנסת למעגל הרדאר (ללא מרחב מוקדם)
    const DETECTION_RANGE_MARGIN = 1.0;

    // Single atomic update: spawn (if due) + threat movement -> radar detection -> city hits -> battery targeting
    set(s => {
      const newFullCoverageRemaining = Math.max(0, s.fullCoverageRemaining - deltaMs / 1000);
      const fullCoverageActive = s.fullCoverageRemaining > 0;
      const eventExpired = s.activeEvent?.duration != null && s.activeEventStartedAt != null && (now - s.activeEventStartedAt >= s.activeEvent.duration);

      // Spawn: decide and apply inside this set() so we only write once per frame (spawn timer in ms)
      const nextSpawnTimer = s.waveSpawnQueue.spawnTimer + deltaMs;
      let threatsForThisFrame = s.threats;
      let waveSpawnQueueNext: typeof s.waveSpawnQueue = { ...s.waveSpawnQueue, spawnTimer: nextSpawnTimer };
      const storyWaveConfig = (s.gameMode === 'story' && s.storyChapterId) ? getStoryWaveConfig(s.storyChapterId, s.wave - 1) : null;
      const waveConfigForSpawn = storyWaveConfig ?? getWaveConfig(s.wave);
      if (s.waveSpawnQueue.currentIndex < s.waveSpawnQueue.spawns.length && nextSpawnTimer >= waveConfigForSpawn.spawnInterval) {
        const waveConfig = waveConfigForSpawn;
        const spawn = s.waveSpawnQueue.spawns[s.waveSpawnQueue.currentIndex];
        const cityPool = s.waveSpawnQueue.targetCityIds.length > 0 ? s.cities.filter(c => s.waveSpawnQueue.targetCityIds.includes(c.id)) : s.cities;
        const targets = cityPool.length > 0 ? cityPool : s.cities;
        const targetCity = targets[Math.floor(Math.random() * targets.length)];
        const chapter = (s.gameMode === 'story' && s.storyChapterId) ? getStoryChapter(s.storyChapterId) : null;
        const useChapterOrigin = !!chapter?.originKey && (spawn.type === 'rocket' || spawn.type === 'cruise' || spawn.type === 'ballistic');
        const spawnLoc = spawn.type === 'drone' || spawn.type === 'fighter' || spawn.type === 'helicopter'
          ? getSpawnLocationFromSea()
          : (spawn.type === 'rocket' || spawn.type === 'cruise' || spawn.type === 'ballistic')
            ? (useChapterOrigin ? getRandomSpawnLocationForOrigin(chapter!.originKey!) : getRandomSpawnLocationForThreatType(spawn.type))
            : undefined;
        const newThreat = createThreat(spawn.type, targetCity, s.canvasWidth, s.canvasHeight, spawnLoc ? { lat: spawnLoc.lat, lng: spawnLoc.lng, name: spawnLoc.name } : undefined);
        threatsForThisFrame = [...s.threats, newThreat];
        waveSpawnQueueNext = { ...s.waveSpawnQueue, currentIndex: s.waveSpawnQueue.currentIndex + 1, spawnTimer: 0 };
      }

      const eventRadarMod = s.activeEvent?.effect?.radarRangeModifier ?? 1;
      const radarRangeSq = (r: { range?: number }) => ((r.range ?? 0) * eventRadarMod * DETECTION_RANGE_MARGIN) ** 2;

      // 1) Save previous positions then move threats – so we can detect the moment a fast threat crosses radar (segment vs circle)
      const movedThreats = threatsForThisFrame.map(t => ({ ...t }));
      const prevPositions = movedThreats.map(t => ({ x: t.x, y: t.y }));
      for (const threat of movedThreats) {
        updateThreatPosition(threat, deltaTime);
      }

      // 2) Run detection: land = circle (and sector if radar by sea); naval = sector only. Instant via segment-intersection.
      const effectiveRange = (r: { type: string; range: number }) => (r.range ?? 0) * eventRadarMod * DETECTION_RANGE_MARGIN;
      const threatsWithDetection = movedThreats.map((threat, i) => {
        let isDetected = threat.isDetected || fullCoverageActive;
        const prev = prevPositions[i];
        if (!isDetected && s.radars.length > 0) {
          for (const radar of s.radars) {
            // חמקן (stealth) מתגלה רק על ידי רדאר L-band
            if (threat.type === 'stealth' && radar.type !== 'lband') continue;
            const rEff = effectiveRange(radar);
            if (rEff <= 0) continue;
            const inCircle = (() => { const dx = threat.x - radar.x; const dy = threat.y - radar.y; return dx * dx + dy * dy <= radarRangeSq(radar); })();
            const inSeaSector = isInNavalRadarSector(radar.x, radar.y, threat.x, threat.y, rEff);
            const prevInSector = isInNavalRadarSector(radar.x, radar.y, prev.x, prev.y, rEff);
            const crossedCircle = segmentIntersectsCircle(prev.x, prev.y, threat.x, threat.y, radar.x, radar.y, rEff);
            const crossedSeaSector = crossedCircle && (prevInSector || inSeaSector);
            if (radar.type === 'naval') {
              if (inSeaSector || crossedSeaSector) {
                isDetected = true;
                break;
              }
            } else {
              const inZoneLand = inCircle || (isRadarBySea(radar.x, s.canvasWidth) && inSeaSector);
              if (inZoneLand || crossedCircle) {
                isDetected = true;
                break;
              }
            }
          }
        }
        // גילוי אוטומטי כשמטרה מתקרבת לעיר (כיסוי טבריה וצפון־מזרח – מסלול שלא תמיד נכנס למעגל רדאר)
        if (!isDetected) {
          const targetCity = s.cities.find(c => c.id === threat.targetCityId);
          if (targetCity && distance(threat, targetCity) <= 220) isDetected = true;
        }
        return { ...threat, isDetected };
      });

      const updatedRadars = s.radars.map(radar => {
        const rEff = effectiveRange(radar);
        const inRadar = (threat: { x: number; y: number }) =>
          radar.type === 'naval'
            ? isInNavalRadarSector(radar.x, radar.y, threat.x, threat.y, rEff)
            : (() => { const dx = threat.x - radar.x; const dy = threat.y - radar.y; return dx * dx + dy * dy <= radarRangeSq(radar); })()
              || (isRadarBySea(radar.x, s.canvasWidth) && isInNavalRadarSector(radar.x, radar.y, threat.x, threat.y, rEff));
        return {
          ...radar,
          detectedThreats: threatsWithDetection.filter(threat => inRadar(threat)).map(t => t.id),
        };
      });
      
      // 3) Check city hits (collect threat+city pairs for log)
      const cityHitPairs: { threat: Threat; city: City }[] = [];
      const enemyTerritoryFalls: { threat: Threat }[] = [];
      const updatedThreats: Threat[] = [];
      const newExplosions = [...s.explosions];
      let totalMissed = s.stats.totalMissed;

      for (const threat of threatsWithDetection) {
        const hitCity = checkThreatReachedCity(threat, s.cities);
        if (hitCity) {
          cityHitPairs.push({ threat, city: hitCity });
          newExplosions.push(createExplosion(threat.x, threat.y, true));
          totalMissed++;
        } else if (
          threat.willFallInEnemyTerritory &&
          pointInEnemyTerritory(threat.x, threat.y, s.canvasWidth, s.canvasHeight) &&
          (now - (threat.spawnedAt ?? now)) > 2000
        ) {
          // 20% of threats fall in enemy territory – remove; no city hit, no morale damage; log for AlertsPanel
          enemyTerritoryFalls.push({ threat });
          newExplosions.push(createExplosion(threat.x, threat.y, false));
        } else {
          updatedThreats.push(threat);
        }
      }
      
      const newCities = s.cities.map(city => ({
        ...city,
        isTargeted: updatedThreats.some(t => t.targetCityId === city.id),
      }));
      
      if (cityHitPairs.length > 0) {
        const moraleDamage = cityHitPairs.reduce((sum, { threat }) => sum + getMoraleDamageForThreat(threat.type), 0);
        const newMorale = Math.max(0, s.morale - moraleDamage);
        const newLogEntries = cityHitPairs.map(({ threat, city }) => ({
          threatType: threat.type,
          threatId: threat.id,
          cityId: city.id,
          cityName: city.name,
          timestamp: now,
        }));
        const cityHitLog = [...s.cityHitLog, ...newLogEntries].slice(-30);
        const godMode = usePlayerStore.getState().godMode;
        const gameOver = newMorale <= 0 && !godMode;
        const effectiveMorale = newMorale <= 0 && godMode ? 1 : newMorale;
        const nowTs = now;
        const highScoreNotif = gameOver && s.score > s.stats.highScore
          ? { id: `notif-${nowTs}-${Math.random().toString(36).slice(2, 9)}`, message: t('newHighScore'), type: 'success' as const, timestamp: nowTs, duration: 3000 }
          : null;
        const notifications = highScoreNotif
          ? [...s.notifications, highScoreNotif].slice(-5)
          : s.notifications;
        return {
          threats: updatedThreats,
          waveSpawnQueue: waveSpawnQueueNext,
          radars: updatedRadars,
          cities: newCities,
          explosions: newExplosions,
          morale: effectiveMorale,
          screenShake: 10,
          cityHitFlashUntil: nowTs + 450,
          phase: gameOver ? ('gameOver' as GamePhase) : s.phase,
          stats: { ...s.stats, totalMissed, highScore: gameOver ? Math.max(s.stats.highScore, s.score) : s.stats.highScore },
          waveDamageCount: s.waveDamageCount + cityHitPairs.length,
          consecutiveInterceptions: 0,
          cityHitLog,
          notifications,
          fullCoverageRemaining: newFullCoverageRemaining,
          activeEvent: eventExpired ? null : s.activeEvent,
          activeEventStartedAt: eventExpired ? null : s.activeEventStartedAt,
          enemyTerritoryFallLog: enemyTerritoryFalls.length > 0
            ? [...s.enemyTerritoryFallLog, ...enemyTerritoryFalls.map(({ threat }) => ({ threatType: threat.type, threatId: threat.id, timestamp: now }))].slice(-30)
            : s.enemyTerritoryFallLog,
        };
      }
      
      // 3) Battery targeting – only threats with isDetected from this frame
      const alreadyTargetedThreats = new Set<string>();
      for (const proj of projectilePool.getActive()) {
        alreadyTargetedThreats.add(proj.targetThreatId);
      }
      for (const battery of s.batteries) {
        if (battery.targetThreatId) alreadyTargetedThreats.add(battery.targetThreatId);
      }
      
      const newAmmoPool = { ...s.ammoPool };
      const updatedBatteries = s.batteries.map(battery => {
        const updatedBattery = { ...battery };
        
        if (battery.type === 'laser' && battery.isOverheated) {
          updatedBattery.cooldownProgress += deltaMs / getGameConfig().LASER.cooldownTime;
          if (updatedBattery.cooldownProgress >= 1) {
            updatedBattery.isOverheated = false;
            updatedBattery.cooldownProgress = 0;
            updatedBattery.heatLevel = 0;
          }
        }
        
        // Only target if: threat is detected AND (battery in radar coverage OR full coverage OR battery "defending" target city – סוללה ליד עיר יכולה לירות על מטרות לעיר גם בלי רדאר)
        const inRadarZone = s.radars.some(radar => {
          const range = radar.range ?? 0;
          const inCircle = (() => { const dx = battery.x - radar.x; const dy = battery.y - radar.y; return dx * dx + dy * dy <= range * range; })();
          const inSector = isInNavalRadarSector(radar.x, radar.y, battery.x, battery.y, range);
          return radar.type === 'naval' ? inSector : inCircle || (isRadarBySea(radar.x, s.canvasWidth) && inSector);
        });
        const defendingTargetedCity = s.cities.some(city => {
          const threatToCity = updatedThreats.find(t => t.isDetected && t.targetCityId === city.id);
          if (!threatToCity) return false;
          if (!findClosestThreatInRange(battery, [threatToCity], s.upgrades.radarRange)) return false;
          return distance(battery, city) <= battery.range * 2;
        });
        const batteryInRadarCoverage = fullCoverageActive || inRadarZone || defendingTargetedCity;
        const poolAmmo = battery.type === 'shortRange' ? newAmmoPool.shortRange : battery.type === 'mediumRange' ? newAmmoPool.mediumRange : battery.type === 'longRange' ? newAmmoPool.longRange : battery.type === 'thaad' ? (updatedBattery.ammo ?? 0) : battery.type === 'david' ? (updatedBattery.ammo ?? 0) : battery.type === 'arrow2' ? (updatedBattery.ammo ?? 0) : 0;
        const baseReloadTime = battery.type === 'shortRange' ? getGameConfig().SHORT_RANGE.reloadTime : battery.type === 'mediumRange' ? getGameConfig().MEDIUM_RANGE.reloadTime : battery.type === 'longRange' ? getGameConfig().LONG_RANGE.reloadTime : battery.type === 'thaad' ? (getGameConfig().THAAD?.reloadTime ?? 2500) : battery.type === 'david' ? (getGameConfig().DAVID?.reloadTime ?? 1800) : battery.type === 'arrow2' ? (getGameConfig().ARROW2?.reloadTime ?? 1900) : 0;
        const reloadCooldownMs = baseReloadTime > 0 ? getEffectiveReloadTime(baseReloadTime, s.upgrades.reloadSpeed) : 0;
        const canFire = reloadCooldownMs <= 0 || (now - (battery.lastFiredAt ?? 0)) >= reloadCooldownMs;
        if (battery.type !== 'laser' && poolAmmo > 0 && !battery.targetThreatId && batteryInRadarCoverage && canFire) {
          const availableThreats = updatedThreats.filter(t =>
            !alreadyTargetedThreats.has(t.id) && t.isDetected
          );
          const target = findClosestThreatInRange(
            battery,
            availableThreats,
            s.upgrades.radarRange,
            battery.targetTypes ?? undefined
          );
          if (target) {
            updatedBattery.targetThreatId = target.id;
            updatedBattery.lastFiredAt = now;
            if (battery.type === 'shortRange') newAmmoPool.shortRange--;
            else if (battery.type === 'mediumRange') newAmmoPool.mediumRange--;
            else if (battery.type === 'longRange') newAmmoPool.longRange--;
            else if (battery.type === 'thaad') updatedBattery.ammo = (updatedBattery.ammo ?? 0) - 1;
            else if (battery.type === 'david') updatedBattery.ammo = (updatedBattery.ammo ?? 0) - 1;
            else if (battery.type === 'arrow2') updatedBattery.ammo = (updatedBattery.ammo ?? 0) - 1;
            alreadyTargetedThreats.add(target.id);
            projectilePool.acquire(battery, target);
          }
        }
        // Laser: acquire target (no projectile – continuous beam); 1s delay between targets
        const laserCooldownOk = (updatedBattery.laserAcquireCooldownUntil ?? 0) <= now;
        if (battery.type === 'laser' && !battery.isOverheated && !updatedBattery.targetThreatId && batteryInRadarCoverage && laserCooldownOk) {
          const availableThreats = updatedThreats.filter(t =>
            !alreadyTargetedThreats.has(t.id) && t.isDetected
          );
          const target = findClosestThreatInRange(
            battery,
            availableThreats,
            s.upgrades.radarRange,
            undefined,
            ['drone']
          );
          if (target) {
            updatedBattery.targetThreatId = target.id;
            updatedBattery.isActive = true;
            alreadyTargetedThreats.add(target.id);
          }
        }
        if (updatedBattery.targetThreatId && !updatedThreats.find(t => t.id === updatedBattery.targetThreatId)) {
          updatedBattery.targetThreatId = null;
          if (battery.type === 'laser') {
            updatedBattery.isActive = false;
            updatedBattery.laserAcquireCooldownUntil = now + 1000;
          }
        }
        return updatedBattery;
      });
      
      const newEnemyTerritoryLog =
        enemyTerritoryFalls.length > 0
          ? [...s.enemyTerritoryFallLog, ...enemyTerritoryFalls.map(({ threat }) => ({ threatType: threat.type, threatId: threat.id, timestamp: now }))].slice(-30)
          : s.enemyTerritoryFallLog;

      // 4) Projectile phase – same frame, same set(); no second set() so no mid-frame freeze
      const activeProjectiles = projectilePool.getActive();
      const damagePerHit = s.morale <= getGameConfig().LAST_STAND_MORALE_THRESHOLD ? getGameConfig().LAST_STAND_DAMAGE_PER_HIT : 1;
      const damageMap = new Map<string, number>();
      const explosionAdds: { x: number; y: number }[] = [];
      let newScore = 0;
      let newBudget = 0;
      let interceptions = 0;
      const missRetryFires: { battery: Battery; threat: Threat }[] = [];
      const missFromWave = getGameConfig().INTERCEPT_MISS_FROM_WAVE ?? 5;
      const missChance = getGameConfig().INTERCEPT_MISS_CHANCE ?? 0.1;
      for (const projectile of activeProjectiles) {
        const reached = updateProjectilePosition(projectile);
        const hitThreat = checkProjectileHit(projectile, updatedThreats);
        if (hitThreat) {
          const didMiss = s.wave >= missFromWave && Math.random() < missChance;
          if (didMiss) {
            projectilePool.release(projectile);
            const battery = updatedBatteries.find(b => b.id === projectile.batteryId);
            if (battery) missRetryFires.push({ battery, threat: hitThreat });
          } else {
            damageMap.set(hitThreat.id, (damageMap.get(hitThreat.id) ?? 0) + damagePerHit);
            projectilePool.release(projectile);
          }
        } else if (reached) {
          projectilePool.release(projectile);
        }
      }
      const missRetryNotifications: GameNotification[] = [];
      for (const { battery, threat } of missRetryFires) {
        const poolAmmo = battery.type === 'shortRange' ? newAmmoPool.shortRange : battery.type === 'mediumRange' ? newAmmoPool.mediumRange : battery.type === 'longRange' ? newAmmoPool.longRange : battery.type === 'thaad' ? (updatedBatteries.find(b => b.id === battery.id)?.ammo ?? 0) : battery.type === 'david' ? (updatedBatteries.find(b => b.id === battery.id)?.ammo ?? 0) : battery.type === 'arrow2' ? (updatedBatteries.find(b => b.id === battery.id)?.ammo ?? 0) : 0;
        if (poolAmmo > 0) {
          if (battery.type === 'shortRange') newAmmoPool.shortRange--;
          else if (battery.type === 'mediumRange') newAmmoPool.mediumRange--;
          else if (battery.type === 'longRange') newAmmoPool.longRange--;
          else if (battery.type === 'thaad') {
            const idx = updatedBatteries.findIndex(b => b.id === battery.id);
            if (idx >= 0 && (updatedBatteries[idx].ammo ?? 0) > 0) {
              updatedBatteries[idx] = { ...updatedBatteries[idx], ammo: (updatedBatteries[idx].ammo ?? 0) - 1 };
            }
          }
          else if (battery.type === 'david') {
            const idx = updatedBatteries.findIndex(b => b.id === battery.id);
            if (idx >= 0 && (updatedBatteries[idx].ammo ?? 0) > 0) {
              updatedBatteries[idx] = { ...updatedBatteries[idx], ammo: (updatedBatteries[idx].ammo ?? 0) - 1 };
            }
          }
          else if (battery.type === 'arrow2') {
            const idx = updatedBatteries.findIndex(b => b.id === battery.id);
            if (idx >= 0 && (updatedBatteries[idx].ammo ?? 0) > 0) {
              updatedBatteries[idx] = { ...updatedBatteries[idx], ammo: (updatedBatteries[idx].ammo ?? 0) - 1 };
            }
          }
          projectilePool.acquire(battery, threat);
          missRetryNotifications.push({ id: `notif-miss-${now}-${battery.id}-${Math.random().toString(36).slice(2, 9)}`, message: 'טיל נוסף יצא – הקודם פספס', type: 'info', timestamp: now, duration: 2500 });
        }
      }

      // Laser damage – continuous beam on targeted threat; heat builds until overheat (deltaMs so 3s fire → 3s overheat)
      const laserConfig = getGameConfig().LASER;
      const laserDamagePerFrame = (laserConfig.damagePerSecond * deltaMs) / 1000;
      const heatPerMs = 1; // reach maxHeatTime (3000) in maxHeatTime ms
      const LASER_ACQUIRE_DELAY_MS = 1000;
      const laserBatteryUpdates = new Map<string, { heatLevel: number; isOverheated: boolean; targetThreatId: string | null; isActive: boolean; laserAcquireCooldownUntil?: number }>();
      for (const battery of updatedBatteries) {
        if (battery.type !== 'laser' || !battery.targetThreatId) continue;
        const threat = updatedThreats.find(t => t.id === battery.targetThreatId);
        if (!threat) continue;
        damageMap.set(threat.id, (damageMap.get(threat.id) ?? 0) + laserDamagePerFrame);
        const newHeat = (battery.heatLevel ?? 0) + heatPerMs * deltaMs;
        const overheat = newHeat >= laserConfig.maxHeatTime;
        laserBatteryUpdates.set(battery.id, {
          heatLevel: overheat ? 0 : newHeat,
          isOverheated: overheat,
          targetThreatId: overheat ? null : battery.targetThreatId,
          isActive: !overheat,
          ...(overheat ? { laserAcquireCooldownUntil: now + LASER_ACQUIRE_DELAY_MS } : {}),
        });
      }
      let updatedBatteriesWithLaser = updatedBatteries;
      if (laserBatteryUpdates.size > 0) {
        updatedBatteriesWithLaser = updatedBatteries.map(b => {
          const u = laserBatteryUpdates.get(b.id);
          if (!u) return b;
          return { ...b, ...u };
        });
      }

      const nextThreats = updatedThreats.map(t => {
        const hits = damageMap.get(t.id) ?? 0;
        if (hits === 0) return t;
        const newHealth = t.health - hits;
        if (newHealth <= 0) return null;
        return { ...t, health: newHealth };
      }).filter((t): t is Threat => t !== null);
      const deadThreatIds = new Set(updatedThreats.filter(t => (damageMap.get(t.id) ?? 0) > 0 && t.health - (damageMap.get(t.id) ?? 0) <= 0).map(t => t.id));
      for (const t of updatedThreats) {
        const hits = damageMap.get(t.id) ?? 0;
        if (hits > 0 && t.health - hits <= 0) {
          explosionAdds.push({ x: t.x, y: t.y });
          newScore += getThreatReward(t.type);
          newBudget += getThreatReward(t.type);
          interceptions++;
        }
      }
      const nextBatteries = updatedBatteriesWithLaser.map(b =>
        deadThreatIds.has(b.targetThreatId ?? '')
          ? { ...b, targetThreatId: null as string | null, isActive: b.type === 'laser' ? false : b.isActive, ...(b.type === 'laser' ? { laserAcquireCooldownUntil: now + 1000 } : {}) }
          : b
      );

      const nextLaserBeams: LaserBeam[] = nextBatteries
        .filter((b): b is Battery & { targetThreatId: string } => b.type === 'laser' && b.targetThreatId != null && b.isActive)
        .map(b => {
          const threat = nextThreats.find(t => t.id === b.targetThreatId);
          if (!threat) return null;
          return { batteryId: b.id, startX: b.x, startY: b.y, endX: threat.x, endY: threat.y, alpha: 1 };
        })
        .filter((b): b is LaserBeam => b != null);

      const timeSinceLastIntercept = now - s.combo.lastInterceptTime;
      let newCombo = s.combo.current;
      if (interceptions > 0) {
        newCombo = timeSinceLastIntercept < s.combo.comboWindow ? s.combo.current + interceptions : interceptions;
      }
      const maxCombo = Math.max(s.combo.max, newCombo);
      const comboMultiplier = 1 + (newCombo * 0.05);
      const bonusScore = Math.round(newScore * comboMultiplier);
      const bonusBudget = Math.round(newBudget * comboMultiplier);

      const allExplosions = [...newExplosions, ...explosionAdds.map(({ x, y }) => createExplosion(x, y))];
      const nextExplosions: Explosion[] = [];
      for (const exp of allExplosions) {
        const { updated, done } = updateExplosionImmutable(exp, deltaTime);
        if (!done) nextExplosions.push(updated);
      }
      const nextScreenShake = s.screenShake > 0 ? Math.max(0, s.screenShake - 0.5) : (interceptions > 0 ? 3 : 0);
      const allTargetsGone =
        nextThreats.length === 0 &&
        projectilePool.getActive().length === 0 &&
        waveSpawnQueueNext.currentIndex >= waveSpawnQueueNext.spawns.length;
      let nextNotifications = [...s.notifications, ...missRetryNotifications].filter(n => now - n.timestamp < (n.duration ?? 3000));
      let nextPhase: GamePhase = s.phase;
      let waveCompleteReadyAt: number | null = s.waveCompleteReadyAt;
      let didWaveComplete = false;
      if (allTargetsGone) {
        if (waveCompleteReadyAt == null) waveCompleteReadyAt = now;
        const delayMs = 2000;
        if (now - waveCompleteReadyAt >= delayMs) {
          didWaveComplete = true;
          nextNotifications = [...nextNotifications, { id: `notif-${now}-${Math.random().toString(36).slice(2, 9)}`, message: t('waveComplete'), type: 'success' as const, timestamp: now, duration: 3000 }].slice(-5);
          if (s.gameMode === 'story' && s.storyChapterId) {
            const chapter = getStoryChapter(s.storyChapterId);
            if (chapter && s.wave >= chapter.waves.length) {
              nextPhase = 'storyChapterComplete';
            } else {
              nextPhase = 'waveComplete';
            }
          } else {
            nextPhase = 'waveComplete';
          }
          waveCompleteReadyAt = null;
        }
      } else {
        waveCompleteReadyAt = null;
      }

      return {
        threats: nextThreats,
        waveSpawnQueue: waveSpawnQueueNext,
        radars: updatedRadars,
        cities: newCities,
        batteries: nextBatteries,
        laserBeams: nextLaserBeams,
        ammoPool: newAmmoPool,
        explosions: nextExplosions,
        enemyTerritoryFallLog: newEnemyTerritoryLog,
        screenShake: interceptions > 0 ? 3 : nextScreenShake,
        phase: nextPhase,
        waveCompleteReadyAt,
        notifications: nextNotifications,
        fullCoverageRemaining: newFullCoverageRemaining,
        activeEvent: eventExpired ? null : s.activeEvent,
        activeEventStartedAt: eventExpired ? null : s.activeEventStartedAt,
        stats: didWaveComplete
          ? { ...s.stats, totalWavesCompleted: Math.max(s.stats.totalWavesCompleted, s.wave), totalInterceptions: s.stats.totalInterceptions + interceptions }
          : { ...s.stats, totalInterceptions: s.stats.totalInterceptions + interceptions },
        score: s.score + bonusScore,
        budget: s.budget + bonusBudget + (didWaveComplete ? getGameConfig().WAVE_COMPLETE_BONUS : 0),
        combo: {
          ...s.combo,
          current: newCombo,
          max: maxCombo,
          lastInterceptTime: interceptions > 0 ? now : s.combo.lastInterceptTime,
        },
        consecutiveInterceptions: s.consecutiveInterceptions + interceptions,
      };
    });
  },

  getSerializableStateSnapshot: (): GameStateSnapshot => {
    const s = get();
    return {
      phase: s.phase,
      budget: s.budget,
      morale: s.morale,
      score: s.score,
      wave: s.wave,
      isEndless: s.isEndless,
      cities: [...s.cities],
      threats: s.threats.map(t => ({ ...t, trailPositions: [...(t.trailPositions || [])] })),
      batteries: s.batteries.map(b => ({ ...b })),
      projectiles: s.projectiles.map(p => ({ ...p, trailPositions: [...(p.trailPositions || [])] })),
      explosions: s.explosions.map(e => ({ ...e, particles: [...(e.particles || [])] })),
      laserBeams: s.laserBeams.map(l => ({ ...l })),
      radars: s.radars.map(r => ({ ...r })),
      selectedBatteryId: s.selectedBatteryId,
      placingBatteryType: s.placingBatteryType,
      placingRadarType: s.placingRadarType,
      previewPosition: s.previewPosition ? { x: s.previewPosition.x, y: s.previewPosition.y } : null,
      upgrades: { ...s.upgrades },
      laserUnlocked: s.laserUnlocked,
      ammoPool: { ...s.ammoPool },
      stats: { ...s.stats },
      notifications: [...s.notifications],
      cityHitLog: [...s.cityHitLog],
      enemyTerritoryFallLog: [...s.enemyTerritoryFallLog],
      screenShake: s.screenShake,
      fullCoverageRemaining: s.fullCoverageRemaining,
      alliedSupportUsed: s.alliedSupportUsed,
      waveSpawnQueue: {
        spawns: [...s.waveSpawnQueue.spawns],
        currentIndex: s.waveSpawnQueue.currentIndex,
        spawnTimer: s.waveSpawnQueue.spawnTimer,
        targetCityIds: [...s.waveSpawnQueue.targetCityIds],
      },
      combo: { ...s.combo },
      waveDamageCount: s.waveDamageCount,
      consecutiveInterceptions: s.consecutiveInterceptions,
      canvasWidth: s.canvasWidth,
      canvasHeight: s.canvasHeight,
      waveCompleteReadyAt: s.waveCompleteReadyAt,
      preparationStartedAt: s.preparationStartedAt,
      cityHitFlashUntil: s.cityHitFlashUntil,
      waveStartShowUntil: s.waveStartShowUntil,
      gameMode: s.gameMode,
      storyChapterId: s.storyChapterId,
      activeEvent: s.activeEvent ? { ...s.activeEvent, effect: { ...s.activeEvent.effect } } : null,
      activeEventStartedAt: s.activeEventStartedAt,
      thaadExtraAmmo: s.thaadExtraAmmo,
    };
  },

  replaceStateFromHost: (snapshot) => {
    set({
      phase: snapshot.phase,
      budget: snapshot.budget,
      morale: snapshot.morale,
      score: snapshot.score,
      wave: snapshot.wave,
      isEndless: snapshot.isEndless,
      cities: snapshot.cities,
      threats: snapshot.threats,
      batteries: snapshot.batteries,
      projectiles: snapshot.projectiles,
      explosions: snapshot.explosions,
      laserBeams: snapshot.laserBeams,
      radars: snapshot.radars,
      selectedBatteryId: snapshot.selectedBatteryId,
      placingBatteryType: snapshot.placingBatteryType as BatteryType | null,
      placingRadarType: snapshot.placingRadarType as RadarType | null,
      previewPosition: snapshot.previewPosition,
      upgrades: snapshot.upgrades,
      laserUnlocked: snapshot.laserUnlocked,
      ammoPool: snapshot.ammoPool,
      stats: snapshot.stats,
      notifications: snapshot.notifications,
      cityHitLog: snapshot.cityHitLog,
      enemyTerritoryFallLog: snapshot.enemyTerritoryFallLog,
      screenShake: snapshot.screenShake,
      fullCoverageRemaining: snapshot.fullCoverageRemaining,
      alliedSupportUsed: snapshot.alliedSupportUsed,
      waveSpawnQueue: snapshot.waveSpawnQueue,
      combo: snapshot.combo,
      waveDamageCount: snapshot.waveDamageCount,
      consecutiveInterceptions: snapshot.consecutiveInterceptions,
      canvasWidth: snapshot.canvasWidth,
      canvasHeight: snapshot.canvasHeight,
      waveCompleteReadyAt: snapshot.waveCompleteReadyAt,
      preparationStartedAt: snapshot.preparationStartedAt,
      cityHitFlashUntil: snapshot.cityHitFlashUntil,
      waveStartShowUntil: snapshot.waveStartShowUntil,
      gameMode: snapshot.gameMode,
      storyChapterId: snapshot.storyChapterId,
      activeEvent: snapshot.activeEvent,
      activeEventStartedAt: snapshot.activeEventStartedAt,
      thaadExtraAmmo: snapshot.thaadExtraAmmo,
    });
  },
}));
