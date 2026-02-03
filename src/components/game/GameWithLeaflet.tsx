// Full Game with Leaflet Map - משחק מלא עם מפת Leaflet
import { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useSoundManager } from '@/hooks/useSoundManager';
import { HUD } from './HUD';
import { ActionBar } from './ActionBar';
import { BatteryInfo } from './BatteryInfo';
import { ShopModal } from './ShopModal';
import { GameOverModal } from './GameOverModal';
import { WaveCompleteModal } from './WaveCompleteModal';
import { MainMenu } from './MainMenu';
import { AuthModal } from './AuthModal';
import { StoryMenu } from './StoryMenu';
import { useAuth } from '@/contexts/AuthContext';
import { StoryNarrativeScreen } from './StoryNarrativeScreen';
import { StoryChapterCompleteModal } from './StoryChapterCompleteModal';
import { SettingsModal } from './SettingsModal';
import { StatsModal } from './StatsModal';
import { ChallengesModal } from './ChallengesModal';
import { DailyRewardModal } from './DailyRewardModal';
import { MainMenuShopModal } from './MainMenuShopModal';
import { TutorialOverlay } from './TutorialOverlay';
import { updateDailyProgress, updateWeeklyProgress } from '@/lib/game/dailyChallenges';
import { ErrorToast } from './ErrorToast';
import { ComboDisplay } from './ComboDisplay';
import { AchievementToast } from './AchievementToast';
import { EventNotification } from './EventNotification';
import { AlertsPanel } from './AlertsPanel';
import { BuffsPanel } from './BuffsPanel';
import { projectilePool } from '@/lib/game/objectPool';
import { getThreatColor, getBatteryColor, getThreatName, NAVAL_SEA_ANGLE, NAVAL_SECTOR_HALF } from '@/lib/game/entities';
import { applyScreenShake, drawLaserBeam } from '@/lib/game/renderer';
import { getGameConfig } from '@/lib/game/gameConfigLoader';
import { getWaveConfig } from '@/lib/game/waves';
import { getStoryWaveConfig } from '@/lib/game/storyMode';
import { getWaveHint } from '@/lib/game/waveHints';
import { PREPARATION_DURATION_MS } from '@/lib/constants';
import { usePlayerStore } from '@/store/playerStore';
import { soundManager } from '@/lib/audio/SoundManager';
import { supabase } from '@/lib/supabase';
import { checkAchievements } from '@/lib/game/achievements';
import { rollForEvent } from '@/lib/game/randomEvents';
import { ISRAEL_MAP_BOUNDS, ISRAEL_ASPECT_RATIO, CITIES_LATLNG, getInitialCitiesForMap, ISRAEL_BORDER_POLYGON, latLngToNormalized } from '@/lib/game/israelMap';
import { LogOut, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Map configuration – Israel only
const MAP_CONFIG = {
  center: [31.5, 35.1] as [number, number],
  zoom: 8,
  minZoom: 7,
  maxZoom: 10,
  bounds: ISRAEL_MAP_BOUNDS,
};

// Match gameStore: detection zone is range * this margin; circle on map = detection zone
// Match gameStore: detection = radar.range (1.0) so drawn circle = detection zone
const DETECTION_RANGE_MARGIN = 1.0;

export function GameWithLeaflet() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markersRef = useRef<{ cities: L.Marker[]; batteries: L.Layer[]; radars: L.Layer[] }>({
    cities: [],
    batteries: [],
    radars: [],
  });
  const heatMapLayerRef = useRef<L.LayerGroup | null>(null);
  const [showHeatMap, setShowHeatMap] = useState(false);
  
  // Zustand store
  const phase = useGameStore(state => state.phase);
  const cities = useGameStore(state => state.cities);
  const batteries = useGameStore(state => state.batteries);
  const radars = useGameStore(state => state.radars);
  const threats = useGameStore(state => state.threats);
  const explosions = useGameStore(state => state.explosions);
  const budget = useGameStore(state => state.budget);
  const wave = useGameStore(state => state.wave);
  const score = useGameStore(state => state.score);
  const morale = useGameStore(state => state.morale);
  const isEndless = useGameStore(state => state.isEndless);
  const notifications = useGameStore(state => state.notifications);
  const cityHitLog = useGameStore(state => state.cityHitLog);
  const stats = useGameStore(state => state.stats);
  const laserUnlocked = useGameStore(state => state.laserUnlocked);
  const placingBatteryType = useGameStore(state => state.placingBatteryType);
  const placingRadarType = useGameStore(state => state.placingRadarType);
  const selectedBatteryId = useGameStore(state => state.selectedBatteryId);
  const upgrades = useGameStore(state => state.upgrades);
  const combo = useGameStore(state => state.combo);
  const waveDamageCount = useGameStore(state => state.waveDamageCount);
  const consecutiveInterceptions = useGameStore(state => state.consecutiveInterceptions);
  const fullCoverageRemaining = useGameStore(state => state.fullCoverageRemaining ?? 0);
  
  const startGameRaw = useGameStore(state => state.startGame);
  const startStoryGameRaw = useGameStore(state => state.startStoryGame);
  const exitStoryToMenu = useGameStore(state => state.exitStoryToMenu);
  const storyChapterId = useGameStore(state => state.storyChapterId);
  const gameMode = useGameStore(state => state.gameMode);
  const [menuScreen, setMenuScreen] = useState<'main' | 'storyList' | 'storyNarrative'>('main');
  const [storyMenuChapterId, setStoryMenuChapterId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, signOut } = useAuth();
  // Pass map-aligned cities so threats fly towards visible city positions
  const startGame = useCallback(() => {
    startGameRaw(getInitialCitiesForMap(getGameConfig().CANVAS_WIDTH, getGameConfig().CANVAS_HEIGHT));
  }, [startGameRaw]);
  const startStoryGame = useCallback((chapterId: string) => {
    startStoryGameRaw(chapterId, getInitialCitiesForMap(getGameConfig().CANVAS_WIDTH, getGameConfig().CANVAS_HEIGHT));
    setMenuScreen('main');
    setStoryMenuChapterId(null);
  }, [startStoryGameRaw]);
  const startPlacingBattery = useGameStore(state => state.startPlacingBattery);
  const startPlacingRadar = useGameStore(state => state.startPlacingRadar);
  const cancelPlacement = useGameStore(state => state.cancelPlacement);
  const buyAmmo = useGameStore(state => state.buyAmmo);
  const ammoPool = useGameStore(state => state.ammoPool);
  const selectBattery = useGameStore(state => state.selectBattery);
  const reloadBattery = useGameStore(state => state.reloadBattery);
  const placeBattery = useGameStore(state => state.placeBattery);
  const placeRadar = useGameStore(state => state.placeRadar);
  const purchaseUpgrade = useGameStore(state => state.purchaseUpgrade);
  const unlockLaser = useGameStore(state => state.unlockLaser);
  const purchaseMoraleBoost = useGameStore(state => state.purchaseMoraleBoost);
  const buyBudgetWithDiamonds = useGameStore(state => state.buyBudgetWithDiamonds);
  const nextWave = useGameStore(state => state.nextWave);
  const startWaveFromPreparation = useGameStore(state => state.startWaveFromPreparation);
  const preparationStartedAt = useGameStore(state => state.preparationStartedAt);
  const openShop = useGameStore(state => state.openShop);
  const setPhase = useGameStore(state => state.setPhase);
  const update = useGameStore(state => state.update);
  
  // Player profile store
  const playerAchievements = usePlayerStore(state => state.achievements);
  const unlockAchievement = usePlayerStore(state => state.unlockAchievement);
  const playerStats = usePlayerStore(state => state.stats);
  const updatePlayerStats = usePlayerStore(state => state.updateStats);
  const recordBatteryUsed = usePlayerStore(state => state.recordBatteryUsed);
  const addDiamonds = usePlayerStore(state => state.addDiamonds);
  const diamonds = usePlayerStore(state => state.diamonds);
  const lastWaveDiamondsGiven = useRef(0);
  
  // Achievement toast state
  const [pendingAchievement, setPendingAchievement] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showMainShop, setShowMainShop] = useState(false);
  const [showTutorialFromMenu, setShowTutorialFromMenu] = useState(false);
  const canClaimDailyReward = usePlayerStore((s) => s.canClaimDailyReward());
  const tutorialSeen = usePlayerStore(state => state.settings?.tutorialSeen ?? false);
  const setTutorialSeen = usePlayerStore(state => state.setTutorialSeen);
  const firstGameInstructionsShown = usePlayerStore(state => state.settings?.firstGameInstructionsShown ?? false);
  const setFirstGameInstructionsShown = usePlayerStore(state => state.setFirstGameInstructionsShown);
  
  // Apply saved settings (theme, volume) on mount
  const settings = usePlayerStore(state => state.settings ?? { volume: 0.5, language: 'he', theme: 'dark', highContrast: false, fontSize: 'normal', reduceMotion: false });
  useEffect(() => {
    soundManager.setVolume(settings.volume);
    const root = document.documentElement;
    if (settings.theme === 'light') root.classList.add('theme-light');
    else root.classList.remove('theme-light');
    if (settings.highContrast) root.classList.add('accessibility-high-contrast');
    else root.classList.remove('accessibility-high-contrast');
    if (settings.fontSize === 'large') root.classList.add('accessibility-large-text');
    else root.classList.remove('accessibility-large-text');
    if (settings.reduceMotion) root.classList.add('accessibility-reduce-motion');
    else root.classList.remove('accessibility-reduce-motion');
  }, [settings.volume, settings.theme, settings.highContrast, settings.fontSize, settings.reduceMotion]);
  
  // Random event state
  const activeEvent = useGameStore(state => state.activeEvent);
  const setActiveEvent = useGameStore(state => state.setActiveEvent);
  const [lastEventWave, setLastEventWave] = useState(0);
  const [preparationRemaining, setPreparationRemaining] = useState(0);
  
  const sounds = useSoundManager();
  
  // Preparation phase: countdown and auto-start when 0
  useEffect(() => {
    if (phase !== 'preparation' || preparationStartedAt == null) return;
    const tick = () => {
      const elapsed = Date.now() - preparationStartedAt;
      const remaining = Math.max(0, Math.ceil((PREPARATION_DURATION_MS - elapsed) / 1000));
      setPreparationRemaining(remaining);
      if (remaining <= 0) {
        try {
          startWaveFromPreparation();
          soundManager.play('waveComplete');
        } catch {
          // Defensive: avoid unhandled error breaking interval
        }
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, preparationStartedAt, startWaveFromPreparation]);
  const selectedBattery = batteries.find(b => b.id === selectedBatteryId) || null;
  const prevInterceptionsRef = useRef(stats.totalInterceptions);
  const prevCityHitLogLenRef = useRef(cityHitLog.length);

  // Play intercept sound when a threat is destroyed (UX feedback)
  useEffect(() => {
    if (phase !== 'playing') return;
    if (stats.totalInterceptions > prevInterceptionsRef.current) {
      sounds.playInterceptSound();
      prevInterceptionsRef.current = stats.totalInterceptions;
    }
  }, [phase, stats.totalInterceptions, sounds]);

  // Play city hit sound when a city is hit (UX feedback)
  useEffect(() => {
    if (phase === 'menu') {
      prevCityHitLogLenRef.current = 0;
      return;
    }
    if (phase !== 'playing' && phase !== 'gameOver') return;
    if (cityHitLog.length > prevCityHitLogLenRef.current) {
      sounds.playCityHit();
      prevCityHitLogLenRef.current = cityHitLog.length;
    }
  }, [phase, cityHitLog.length, sounds]);
  
  // Update daily and weekly challenges when wave completes or game over
  useEffect(() => {
    if (phase !== 'waveComplete' && phase !== 'gameOver') return;
    const payload = {
      totalInterceptions: stats.totalInterceptions,
      wavesCompleted: stats.totalWavesCompleted,
      maxCombo: combo.max,
      perfectWaves: waveDamageCount === 0 ? 1 : 0,
    };
    updateDailyProgress(payload);
    updateWeeklyProgress(payload);
  }, [phase, stats.totalInterceptions, stats.totalWavesCompleted, combo.max, waveDamageCount]);

  // Diamonds only on daily task (wave) completion – award once per wave when phase becomes waveComplete
  useEffect(() => {
    if (phase === 'menu') lastWaveDiamondsGiven.current = 0;
    if (phase !== 'waveComplete' || wave <= lastWaveDiamondsGiven.current) return;
    addDiamonds(getGameConfig().DIAMONDS_PER_WAVE_COMPLETE);
    lastWaveDiamondsGiven.current = wave;
  }, [phase, wave, addDiamonds]);

  // קיצורי מקלדת: R = חנות, ESC = ביטול הצבת סוללה/רדאר
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (state.phase === 'playing') {
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          state.openShop();
        }
      }
      if (state.placingBatteryType || state.placingRadarType) {
        if (e.key === 'Escape') {
          e.preventDefault();
          state.cancelPlacement();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Sync diamonds with profile when user is logged in. If profiles/diamonds missing (400), remember in localStorage and never request again – no 400 in console after first time.
  const PROFILES_DIAMONDS_UNSUPPORTED_KEY = 'sky_shield_profiles_diamonds_unsupported';
  const userId = user?.id;
  const profilesSyncDisabledRef = useRef(
    typeof localStorage !== 'undefined' && !!localStorage.getItem(PROFILES_DIAMONDS_UNSUPPORTED_KEY)
  );
  useEffect(() => {
    if (!userId || profilesSyncDisabledRef.current) return;
    supabase.from('profiles').select('diamonds').eq('id', userId).maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          profilesSyncDisabledRef.current = true;
          try { localStorage.setItem(PROFILES_DIAMONDS_UNSUPPORTED_KEY, '1'); } catch { /* ignore */ }
          return;
        }
        if (data?.diamonds != null) usePlayerStore.setState({ diamonds: data.diamonds });
      })
      .catch(() => {
        profilesSyncDisabledRef.current = true;
        try { localStorage.setItem(PROFILES_DIAMONDS_UNSUPPORTED_KEY, '1'); } catch { /* ignore */ }
      });
  }, [userId]);
  const diamondsSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!userId || profilesSyncDisabledRef.current) return;
    if (diamondsSyncRef.current) clearTimeout(diamondsSyncRef.current);
    diamondsSyncRef.current = setTimeout(() => {
      if (profilesSyncDisabledRef.current) {
        diamondsSyncRef.current = null;
        return;
      }
      supabase.from('profiles').update({ diamonds }).eq('id', userId)
        .then(({ error }) => {
          if (error) {
            profilesSyncDisabledRef.current = true;
            try { localStorage.setItem(PROFILES_DIAMONDS_UNSUPPORTED_KEY, '1'); } catch { /* ignore */ }
          }
        })
        .catch(() => {
          profilesSyncDisabledRef.current = true;
          try { localStorage.setItem(PROFILES_DIAMONDS_UNSUPPORTED_KEY, '1'); } catch { /* ignore */ }
        });
      diamondsSyncRef.current = null;
    }, 1500);
    return () => { if (diamondsSyncRef.current) clearTimeout(diamondsSyncRef.current); };
  }, [userId, diamonds]);

  // הוראות מהתפריט – רקשחקן לוחץ "איך לשחק". הוראות משחק ראשון מוצגות כשמתחיל לשחק (להלן).
  
  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    const map = L.map(mapContainerRef.current, {
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: false,
      keyboard: true,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);
    
    // Israel bounds – zoom and pan allowed; maxBounds keeps view over region
    const b = MAP_CONFIG.bounds;
    const israelBounds = L.latLngBounds(
      [b.south, b.west],
      [b.north, b.east]
    );
    map.fitBounds(israelBounds, { padding: [20, 20], maxZoom: 9 });
    map.setMaxBounds(israelBounds.pad(0.15));
    
    mapRef.current = map;
    
    // Set canvas dimensions
    useGameStore.getState().setCanvasDimensions(getGameConfig().CANVAS_WIDTH, getGameConfig().CANVAS_HEIGHT);
    
    return () => {
      // כבה zoom מגלילה לפני הסרה – מונע _leaflet_pos כשהמפה כבר הוסרה מהדום
      try {
        if ((map as L.Map & { scrollWheelZoom?: { disable?: () => void } }).scrollWheelZoom?.disable) {
          (map as L.Map & { scrollWheelZoom: { disable: () => void } }).scrollWheelZoom.disable();
        }
      } catch { /* ignore */ }
      map.remove();
      mapRef.current = null;
    };
  }, []);
  
  // Check achievements after each intercept/wave completion
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'waveComplete') return;
    
    const unlockedIds = playerAchievements.filter(a => a.unlocked).map(a => a.id);
    const batteryTypes = batteries.map(b => b.type);
    
    const context = {
      waveDamage: waveDamageCount,
      consecutiveInterceptions,
      currentBudget: budget,
      currentCombo: combo.current,
      totalWaves: wave,
      batteriesCount: batteries.length,
      batteriesUsed: [...new Set(batteryTypes)],
      isEndless,
      endlessWavesSurvived: isEndless ? wave - 10 : 0,
      totalInterceptions: stats.totalInterceptions,
    };
    
    const newAchievements = checkAchievements(context, unlockedIds);
    
    if (newAchievements.length > 0) {
      const achievementId = newAchievements[0];
      unlockAchievement(achievementId);
      // Do not show toast or jingle for "first intercept" – user asked to remove this message
      if (achievementId !== 'first_intercept') {
        setPendingAchievement(achievementId);
        sounds.playWaveCompleteJingle();
      }
    }
  }, [combo.current, phase, waveDamageCount, consecutiveInterceptions, budget, wave, batteries.length, playerAchievements, stats.totalInterceptions, isEndless]);
  
  // Record battery types used
  useEffect(() => {
    batteries.forEach(b => {
      recordBatteryUsed(b.type);
    });
  }, [batteries, recordBatteryUsed]);
  
  // Update player stats on game over
  useEffect(() => {
    if (phase === 'gameOver') {
      updatePlayerStats({
        totalGamesPlayed: playerStats.totalGamesPlayed + 1,
        totalInterceptions: playerStats.totalInterceptions + stats.totalInterceptions,
        totalWavesCompleted: playerStats.totalWavesCompleted + wave,
        highestWave: Math.max(playerStats.highestWave, wave),
        highestScore: Math.max(playerStats.highestScore, score),
        highestCombo: Math.max(playerStats.highestCombo, combo.max),
      });
      
    }
  }, [phase]);
  
  // Roll for random event at wave start – effect (e.g. radar +30%) applied in gameStore until duration expires
  useEffect(() => {
    if (phase === 'playing' && wave > lastEventWave && wave >= 3) {
      const event = rollForEvent(wave);
      if (event) {
        setActiveEvent(event);
        setLastEventWave(wave);
      }
    }
  }, [phase, wave, lastEventWave, setActiveEvent]);

  // Update city markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Clear old markers
    markersRef.current.cities.forEach(m => m.remove());
    markersRef.current.cities = [];
    
    // Add city markers (label only; red border for threatened cities is drawn on canvas overlay)
    CITIES_LATLNG.forEach(cityData => {
      const icon = L.divIcon({
        className: 'city-marker-container',
        html: `
          <div class="flex flex-col items-center">
            <span class="px-2 py-0.5 bg-white/90 rounded text-xs font-bold text-gray-800 whitespace-nowrap shadow">${cityData.name}</span>
          </div>
        `,
        iconSize: [60, 24],
        iconAnchor: [30, 12],
      });
      
      const marker = L.marker([cityData.lat, cityData.lng], { icon, interactive: false }).addTo(map);
      markersRef.current.cities.push(marker);
    });
  }, [cities]);
  
  // Icon paths for battery types – כל מערכת יירוט עם אייקון משלו
  const BATTERY_ICONS: Record<string, string> = {
    shortRange: '/assets/iron-dome.svg',
    mediumRange: '/assets/patriot.svg',
    longRange: '/assets/arrow3.svg',
    laser: '/assets/laser.svg',
    thaad: '/assets/thaad.svg',
    david: '/assets/david.svg',
    arrow2: '/assets/arrow2.svg',
  };

  // Update battery markers – use system icons; סימון תחמושת נמוכה (טבעת אדומה)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.batteries.forEach(m => m.remove());
    markersRef.current.batteries = [];

    batteries.forEach(battery => {
      const latLng = normalizedToLatLng(battery.x, battery.y);
      const color = getBatteryColor(battery.type);
      const isSelected = battery.id === selectedBatteryId;
      const isProjectile = battery.type === 'shortRange' || battery.type === 'mediumRange' || battery.type === 'longRange';
      const isPerBatteryAmmo = battery.type === 'thaad' || battery.type === 'david';
      const ammoPct = isPerBatteryAmmo
        ? (battery.ammo ?? 0) / Math.max(1, battery.maxAmmo ?? 20)
        : isProjectile
          ? (ammoPool[battery.type as keyof typeof ammoPool] ?? 0) / 10
          : 1;
      const isLowAmmo = battery.type !== 'laser' && ammoPct <= 0.25;

      const rangeCircle = L.circle(latLng, {
        radius: battery.range * 300,
        color: color,
        fillColor: color,
        fillOpacity: isSelected ? 0.15 : 0.08,
        weight: isSelected ? 2 : 1,
        dashArray: isSelected ? undefined : '5, 5',
        interactive: false,
      }).addTo(map);

      if (isLowAmmo) {
        const lowRing = L.circle(latLng, { radius: 28, color: '#ef4444', fillColor: 'transparent', weight: 2, interactive: false }).addTo(map);
        markersRef.current.batteries.push(lowRing);
      }

      const iconUrl = BATTERY_ICONS[battery.type] || BATTERY_ICONS.shortRange;
      const size = isSelected ? 44 : 36;
      const batteryMarker = L.marker(latLng, {
        icon: L.icon({
          iconUrl,
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
          className: isLowAmmo ? 'battery-marker-icon battery-low-ammo' : 'battery-marker-icon',
        }),
      }).addTo(map);

      if (isSelected) {
        const ring = L.circle(latLng, { radius: 24, color: color, fillColor: color, fillOpacity: 0.2, weight: 2, interactive: false }).addTo(map);
        markersRef.current.batteries.push(ring);
      }

      batteryMarker.on('click', () => selectBattery(battery.id));
      markersRef.current.batteries.push(rangeCircle as L.Layer, batteryMarker);
    });
  }, [batteries, selectedBatteryId, selectBattery, ammoPool]);
  
  // Icon paths for radar types – כל סוג רדאר עם אייקון משלו
  const RADAR_ICONS: Record<string, string> = {
    basic: '/assets/radar-basic.svg',
    advanced: '/assets/radar-advanced.svg',
    longRange: '/assets/radar-longrange.svg',
    lband: '/assets/radar-lband.svg',
    naval: '/assets/radar-naval.svg',
  };

  // Update radar markers – circle or naval sector; מעגל = אזור גילוי (כולל אירוע תמיכה מלוויין)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.radars.forEach(m => m.remove());
    markersRef.current.radars = [];

    const eventRadarMod = activeEvent?.effect?.radarRangeModifier ?? 1;
    radars.forEach(radar => {
      const latLng = normalizedToLatLng(radar.x, radar.y);
      const range = radar.range * eventRadarMod * DETECTION_RANGE_MARGIN;

      let rangeLayer: L.Circle | L.Polygon;
      if (radar.type === 'naval') {
        const startAngle = NAVAL_SEA_ANGLE - NAVAL_SECTOR_HALF;
        const endAngle = NAVAL_SEA_ANGLE + NAVAL_SECTOR_HALF;
        const arcPoints: [number, number][] = [normalizedToLatLng(radar.x, radar.y)];
        for (let i = 0; i <= 12; i++) {
          const angle = startAngle + (endAngle - startAngle) * (i / 12);
          const nx = radar.x + range * Math.cos(angle);
          const ny = radar.y + range * Math.sin(angle);
          arcPoints.push(normalizedToLatLng(nx, ny));
        }
        rangeLayer = L.polygon(arcPoints, {
          color: 'hsl(190, 70%, 45%)',
          fillColor: 'hsl(190, 70%, 45%)',
          fillOpacity: 0.08,
          weight: 1,
          dashArray: '8, 4',
          interactive: false,
        }).addTo(map);
      } else {
        rangeLayer = L.circle(latLng, {
          radius: range * 300,
          color: 'hsl(140, 70%, 45%)',
          fillColor: 'hsl(140, 70%, 45%)',
          fillOpacity: 0.08,
          weight: 1,
          dashArray: '8, 4',
          interactive: false,
        }).addTo(map);
      }

      const iconUrl = RADAR_ICONS[radar.type] || RADAR_ICONS.basic;
      const size = 36;
      const radarMarker = L.marker(latLng, {
        icon: L.icon({
          iconUrl,
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
          className: 'radar-marker-icon',
        }),
      }).addTo(map);

      markersRef.current.radars.push(rangeLayer, radarMarker);
    });
  }, [radars, activeEvent?.effect?.radarRangeModifier]);

  // Heat map overlay – אזורים "חמים" לפי היסטוריית פגיעות בערים (משתמש בממדי הקנבס של המשחק)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (heatMapLayerRef.current) {
      map.removeLayer(heatMapLayerRef.current);
      heatMapLayerRef.current = null;
    }
    if (!showHeatMap || cityHitLog.length === 0) return;
    const { canvasWidth, canvasHeight } = useGameStore.getState();
    const cw = canvasWidth || getGameConfig().CANVAS_WIDTH;
    const ch = canvasHeight || getGameConfig().CANVAS_HEIGHT;
    const toLatLng = (nx: number, ny: number): [number, number] => {
      const lat = MAP_CONFIG.bounds.north - (ny / ch) * (MAP_CONFIG.bounds.north - MAP_CONFIG.bounds.south);
      const lng = MAP_CONFIG.bounds.west + (nx / cw) * (MAP_CONFIG.bounds.east - MAP_CONFIG.bounds.west);
      return [lat, lng];
    };
    const layer = L.layerGroup();
    const now = Date.now();
    const maxAge = 600000; // 10 minutes – כל הפגיעות במשחק הנוכחי
    cityHitLog.forEach((entry) => {
      const city = cities.find(c => c.id === entry.cityId);
      if (!city) return;
      const age = now - entry.timestamp;
      if (age > maxAge) return;
      const opacity = Math.max(0.2, 0.7 * (1 - age / maxAge));
      const latLng = toLatLng(city.x, city.y);
      L.circle(latLng, {
        radius: 8000,
        color: 'hsl(0, 80%, 50%)',
        fillColor: 'hsl(0, 80%, 50%)',
        fillOpacity: opacity,
        weight: 1,
        interactive: false,
      }).addTo(layer);
    });
    layer.addTo(map);
    heatMapLayerRef.current = layer;
    return () => {
      if (heatMapLayerRef.current) {
        map.removeLayer(heatMapLayerRef.current);
        heatMapLayerRef.current = null;
      }
    };
  }, [showHeatMap, cityHitLog, cities]);
  
  // Handle map clicks
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    const handleClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const state = useGameStore.getState();
      
      // Convert to normalized coordinates
      const x = ((lng - MAP_CONFIG.bounds.west) / (MAP_CONFIG.bounds.east - MAP_CONFIG.bounds.west)) * getGameConfig().CANVAS_WIDTH;
      const y = ((MAP_CONFIG.bounds.north - lat) / (MAP_CONFIG.bounds.north - MAP_CONFIG.bounds.south)) * getGameConfig().CANVAS_HEIGHT;
      
      if (state.placingBatteryType) {
        placeBattery(x, y);
        sounds.playBuildSound();
      } else if (state.placingRadarType) {
        placeRadar(x, y);
        sounds.playBuildSound();
      }
    };
    
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [placeBattery, placeRadar, sounds]);
  
  // Game loop and canvas rendering
  useEffect(() => {
    if (!canvasRef.current || !mapRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const map = mapRef.current;
    if (!ctx) return;
    
    let animationId: number;
    let previousTime = performance.now();
    
    const gameLoop = (currentTime: number) => {
      // אם המפה הוסרה (unmount / ניווט) – עצור את הלופ כדי למנוע _leaflet_pos
      const currentMap = mapRef.current;
      if (!currentMap || currentMap !== map) {
        cancelAnimationFrame(animationId);
        return;
      }
      let container: HTMLElement;
      try {
        container = currentMap.getContainer();
      } catch {
        cancelAnimationFrame(animationId);
        return;
      }
      if (!container || !document.body.contains(container)) {
        cancelAnimationFrame(animationId);
        return;
      }

      const deltaTime = Math.min((currentTime - previousTime) / 16.67, 3);
      previousTime = currentTime;
      
      const state = useGameStore.getState();
      
      // Update game logic
      if (state.phase === 'playing') {
        update(deltaTime, currentTime);
      }
      
      // Resize canvas
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      try {
      // Fresh state for drawing (after update)
      const drawState = useGameStore.getState();
      ctx.save();
      if (drawState.screenShake > 0) applyScreenShake(ctx, drawState.screenShake);
      
      // Helper: convert normalized to pixel (משתמש ב-currentMap – אם הוסר, try/catch ייתפס)
      const normalizedToPixel = (nx: number, ny: number) => {
        const lat = MAP_CONFIG.bounds.north - (ny / getGameConfig().CANVAS_HEIGHT) * (MAP_CONFIG.bounds.north - MAP_CONFIG.bounds.south);
        const lng = MAP_CONFIG.bounds.west + (nx / getGameConfig().CANVAS_WIDTH) * (MAP_CONFIG.bounds.east - MAP_CONFIG.bounds.west);
        const point = currentMap.latLngToContainerPoint([lat, lng]);
        return { x: point.x, y: point.y };
      };
      
      // Draw Israel border overlay
      if (ISRAEL_BORDER_POLYGON.length > 1) {
        ctx.strokeStyle = 'hsla(0, 70%, 50%, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        for (let i = 0; i < ISRAEL_BORDER_POLYGON.length; i++) {
          const [lat, lng] = ISRAEL_BORDER_POLYGON[i];
          const { x, y } = latLngToNormalized(lat, lng, getGameConfig().CANVAS_WIDTH, getGameConfig().CANVAS_HEIGHT);
          const pos = normalizedToPixel(x, y);
          if (i === 0) ctx.moveTo(pos.x, pos.y);
          else ctx.lineTo(pos.x, pos.y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      
      // Threatened cities: red border + flickering diagonal red stripes (low opacity)
      const stripeFlicker = 0.08 + 0.06 * (0.5 + 0.5 * Math.sin(currentTime / 180));
      drawState.cities.filter(c => c.isTargeted).forEach(city => {
        const pos = normalizedToPixel(city.x, city.y);
        const r = 28;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.clip();
        // Diagonal stripes (red, low opacity, flicker)
        const spacing = 8;
        ctx.strokeStyle = `hsla(0, 70%, 50%, ${stripeFlicker})`;
        ctx.lineWidth = 3;
        for (let i = -r * 2; i <= r * 2; i += spacing) {
          ctx.beginPath();
          ctx.moveTo(i - r * 2, -r * 2);
          ctx.lineTo(i + r * 2, r * 2);
          ctx.stroke();
        }
        for (let i = -r * 2; i <= r * 2; i += spacing) {
          ctx.beginPath();
          ctx.moveTo(-r * 2, i - r * 2);
          ctx.lineTo(r * 2, i + r * 2);
          ctx.stroke();
        }
        ctx.restore();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'hsla(0, 70%, 40%, 0.4)';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = 'hsl(0, 90%, 50%)';
        ctx.lineWidth = 4;
        ctx.stroke();
      });

      // Draw projectiles
      const activeProjectiles = projectilePool.getActive();
      activeProjectiles.forEach(projectile => {
        const pos = normalizedToPixel(projectile.x, projectile.y);
        const startPos = projectile.startX != null && projectile.startY != null
          ? normalizedToPixel(projectile.startX, projectile.startY)
          : pos;
        const targetPos = normalizedToPixel(projectile.targetX, projectile.targetY);
        
        // Fixed arc trail from launch to target
        const dx = targetPos.x - startPos.x;
        const dy = targetPos.y - startPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
          const arcHeight = dist * 0.15;
          const midX = (startPos.x + targetPos.x) / 2;
          const midY = (startPos.y + targetPos.y) / 2;
          const perpAngle = Math.atan2(dy, dx) - Math.PI / 2;
          const ctrlX = midX + Math.cos(perpAngle) * arcHeight;
          const ctrlY = midY + Math.sin(perpAngle) * arcHeight;
          ctx.strokeStyle = 'hsla(185, 100%, 50%, 0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(startPos.x, startPos.y);
          ctx.quadraticCurveTo(ctrlX, ctrlY, targetPos.x, targetPos.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        
        // Glow
        const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 12);
        gradient.addColorStop(0, 'hsla(185, 100%, 70%, 0.8)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'hsl(185, 100%, 80%)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw laser beams (battery → threat)
      drawState.laserBeams.forEach(beam => {
        const start = normalizedToPixel(beam.startX, beam.startY);
        const end = normalizedToPixel(beam.endX, beam.endY);
        drawLaserBeam(ctx, { ...beam, startX: start.x, startY: start.y, endX: end.x, endY: end.y });
      });
      
      // Draw threats with arc paths and direction arrows
      drawState.threats.forEach(threat => {
        const pos = normalizedToPixel(threat.x, threat.y);
        const startPos = normalizedToPixel(threat.startX, threat.startY);
        const targetCity = CITIES_LATLNG.find(c => c.id === threat.targetCityId);
        const color = getThreatColor(threat.type);
        
        if (!threat.isDetected) {
          ctx.fillStyle = 'hsla(0, 0%, 60%, 0.25)';
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
          ctx.fill();
          return;
        }
        
        // Fixed arc trajectory from launch (start) to impact (target)
        if (targetCity) {
          const targetPos = normalizedToPixel(
            ((targetCity.lng - MAP_CONFIG.bounds.west) / (MAP_CONFIG.bounds.east - MAP_CONFIG.bounds.west)) * getGameConfig().CANVAS_WIDTH,
            ((MAP_CONFIG.bounds.north - targetCity.lat) / (MAP_CONFIG.bounds.north - MAP_CONFIG.bounds.south)) * getGameConfig().CANVAS_HEIGHT
          );
          const dx = targetPos.x - startPos.x;
          const dy = targetPos.y - startPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 20) {
            const arcHeight = threat.type === 'ballistic' ? dist * 0.35 : dist * 0.12;
            const midX = (startPos.x + targetPos.x) / 2;
            const midY = (startPos.y + targetPos.y) / 2;
            const perpAngle = Math.atan2(dy, dx) - Math.PI / 2;
            const controlX = midX + Math.cos(perpAngle) * arcHeight;
            const controlY = midY + Math.sin(perpAngle) * arcHeight;
            ctx.strokeStyle = color.replace('hsl', 'hsla').replace(')', ', 0.5)');
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.quadraticCurveTo(controlX, controlY, targetPos.x, targetPos.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        
        // Glow around threat
        const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 20);
        gradient.addColorStop(0, color.replace('hsl', 'hsla').replace(')', ', 0.6)'));
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw threat with direction indicator (arrow shape pointing in flight direction)
        const angle = threat.angle;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        
        // Threat body (arrow/missile shape)
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(14, 0);     // Nose
        ctx.lineTo(-6, -7);    // Top wing
        ctx.lineTo(-3, 0);     // Body indent
        ctx.lineTo(-6, 7);     // Bottom wing
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
        
        // No health bar – threats are one-hit (unless missile misses)
        
        // Compact label
        const label = getThreatName(threat.type);
        ctx.font = 'bold 9px Heebo, sans-serif';
        const w = ctx.measureText(label).width + 6;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(pos.x - w/2, pos.y + 14, w, 14);
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(label, pos.x, pos.y + 24);
      });
      
      // Draw explosions
      drawState.explosions.forEach(exp => {
        const pos = normalizedToPixel(exp.x, exp.y);
        const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, exp.radius * 1.5);
        gradient.addColorStop(0, `hsla(50, 100%, 85%, ${exp.alpha})`);
        gradient.addColorStop(0.4, `hsla(35, 100%, 60%, ${exp.alpha * 0.7})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, exp.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        exp.particles.forEach(p => {
          const pp = normalizedToPixel(p.x, p.y);
          ctx.fillStyle = p.color.replace('hsl', 'hsla').replace(')', `, ${p.alpha})`);
          ctx.beginPath();
          ctx.arc(pp.x, pp.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // City hit red flash overlay
      const cityHitFlashUntil = (drawState as { cityHitFlashUntil?: number | null }).cityHitFlashUntil;
      if (cityHitFlashUntil != null && Date.now() < cityHitFlashUntil) {
        const elapsed = cityHitFlashUntil - Date.now();
        const alpha = Math.min(0.35, (elapsed / 450) * 0.35);
        ctx.fillStyle = `rgba(180, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Wave transition overlay – "Wave N" when new wave starts
      const waveStartShowUntil = (drawState as { waveStartShowUntil?: number | null }).waveStartShowUntil;
      const waveNum = drawState.wave;
      if (waveStartShowUntil != null && Date.now() < waveStartShowUntil) {
        const elapsed = waveStartShowUntil - Date.now();
        const alpha = Math.min(0.95, Math.max(0, (elapsed / 2200) * 0.95));
        ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * (1 - alpha)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = 'bold 42px Heebo, sans-serif';
        ctx.fillText(`גל ${waveNum}`, canvas.width / 2, canvas.height / 2);
        ctx.restore();
      }

      ctx.restore();
      } catch {
        cancelAnimationFrame(animationId);
        return;
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [update]);
  
  // Helper function
  const normalizedToLatLng = (nx: number, ny: number): [number, number] => {
    const lat = MAP_CONFIG.bounds.north - (ny / getGameConfig().CANVAS_HEIGHT) * (MAP_CONFIG.bounds.north - MAP_CONFIG.bounds.south);
    const lng = MAP_CONFIG.bounds.west + (nx / getGameConfig().CANVAS_WIDTH) * (MAP_CONFIG.bounds.east - MAP_CONFIG.bounds.west);
    return [lat, lng];
  };
  
  return (
    <div className="game-viewport relative w-full min-h-[320px] overflow-hidden" dir="rtl">
      {/* Fixed aspect ratio: full Israel Metula to Eilat – centered in viewport */}
      <div className="absolute inset-0 flex items-center justify-center bg-game-panel/30">
        <div
          className="max-w-full max-h-full w-full h-full min-h-0 relative"
          style={{ aspectRatio: ISRAEL_ASPECT_RATIO }}
        >
          <div ref={mapContainerRef} className="absolute inset-0 z-0" style={{ background: 'hsl(195, 45%, 82%)' }} />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 pointer-events-none w-full h-full"
          />
        </div>
      </div>
      
      {/* Main Menu / Story Menu / Story Narrative */}
      {phase === 'menu' && menuScreen === 'storyList' && (
        <StoryMenu
          onSelectChapter={(id) => { setStoryMenuChapterId(id); setMenuScreen('storyNarrative'); }}
          onBack={() => setMenuScreen('main')}
        />
      )}
      {phase === 'menu' && menuScreen === 'storyNarrative' && storyMenuChapterId && (
        <StoryNarrativeScreen
          chapterId={storyMenuChapterId}
          onStart={() => startStoryGame(storyMenuChapterId)}
          onBack={() => { setMenuScreen('storyList'); setStoryMenuChapterId(null); }}
        />
      )}
      {phase === 'menu' && menuScreen === 'main' && (
        <MainMenu 
          highScore={stats.highScore}
          onStartGame={startGame}
          hasSavedGame={typeof localStorage !== 'undefined' && !!localStorage.getItem('sky_shield_saved_game')}
          onContinueGame={() => useGameStore.getState().resumeGame()}
          onStartStory={() => setMenuScreen('storyList')}
          onHowToPlay={() => setShowTutorialFromMenu(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenStats={() => setShowStats(true)}
          onOpenChallenges={() => setShowChallenges(true)}
          onOpenDailyReward={() => setShowDailyReward(true)}
          onOpenShop={() => setShowMainShop(true)}
          canClaimDailyReward={canClaimDailyReward}
          userEmail={user?.email ?? null}
          onOpenAuth={() => setAuthModalOpen(true)}
          onSignOut={signOut}
        />
      )}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      
      <StoryChapterCompleteModal
        isOpen={phase === 'storyChapterComplete'}
        chapterId={storyChapterId}
        onClose={exitStoryToMenu}
      />
      
      <TutorialOverlay
        isOpen={showTutorialFromMenu || ((phase === 'preparation' || phase === 'playing') && !firstGameInstructionsShown)}
        onClose={() => {
          if (showTutorialFromMenu) {
            setShowTutorialFromMenu(false);
            setTutorialSeen(true);
          } else {
            setFirstGameInstructionsShown(true);
          }
        }}
      />
      
      {/* Exit & Save + Settings + Heat map (in-game) – responsive */}
      {phase !== 'menu' && (
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-20 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {(phase === 'playing' || phase === 'preparation') && (
            <button
              type="button"
              onClick={() => setShowHeatMap(v => !v)}
              className={showHeatMap ? 'p-2 rounded-lg bg-amber-600/80 border border-amber-400 text-white transition-all duration-200 active:scale-95' : 'p-2 rounded-lg bg-game-panel/90 border border-game-accent/30 text-game-accent hover:bg-game-accent/20 active:scale-95 transition-all duration-200'}
              aria-label="מפת חום"
              title="מפת חום – אזורים שנפגעו"
            >
              מפת חום
            </button>
          )}
          {(phase === 'playing' || phase === 'preparation') && (
            <button
              type="button"
              onClick={() => useGameStore.getState().saveGameAndExit()}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-game-panel/90 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all duration-200 text-sm"
              aria-label="יציאה ושמירה"
              title="יציאה ושמירה"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">יציאה ושמירה</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg bg-game-panel/90 border border-game-accent/30 text-game-accent hover:bg-game-accent/20 active:scale-95 transition-all duration-200"
            aria-label="הגדרות"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      )}
      
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <ChallengesModal isOpen={showChallenges} onClose={() => setShowChallenges(false)} />
      <DailyRewardModal isOpen={showDailyReward} onClose={() => setShowDailyReward(false)} />
      <MainMenuShopModal isOpen={showMainShop} onClose={() => setShowMainShop(false)} />
      
      {/* HUD */}
      {phase !== 'menu' && (
        <HUD
          budget={budget}
          diamonds={diamonds}
          wave={wave}
          score={score}
          morale={morale}
          isEndless={isEndless}
          notifications={notifications}
          combo={combo.current}
          ammoPool={ammoPool}
          onBuyAmmo={buyAmmo}
          activeThreats={threats.length}
          fullCoverageRemaining={fullCoverageRemaining}
        />
      )}

      {/* Right-side alerts by area – type shown only when radar detects */}
      {phase === 'playing' && <AlertsPanel />}
      {/* Buffs from main menu shop – player chooses when to activate */}
      {phase === 'playing' && <BuffsPanel />}
      
      {/* Preparation phase – compact panel in corner, responsive */}
      {phase === 'preparation' && (
        <div className="absolute top-4 left-2 sm:left-4 z-30 flex flex-col gap-2 p-3 sm:p-4 bg-game-panel/95 backdrop-blur-sm border border-game-accent/30 rounded-xl shadow-xl max-w-[calc(100vw-1rem)] sm:max-w-xs" dir="rtl">
          <h2 className="text-lg font-bold text-game-accent">גל {wave} – שלב הכנה</h2>
          <p className="text-game-text text-sm">
            הצב רדארים וסוללות על המפה. כשמוכן – לחץ &quot;התחל התקפה&quot; או חכה לסיום הספירה.
          </p>
          <p className="text-game-text-dim text-sm">
            ההתקפה מתחילה בעוד <strong className="text-game-accent">{preparationRemaining}</strong> שניות
          </p>
          {preparationRemaining >= 1 && preparationRemaining <= 20 && (() => {
            const waveConfig = (gameMode === 'story' && storyChapterId)
              ? (getStoryWaveConfig(storyChapterId, wave - 1) ?? getWaveConfig(wave))
              : getWaveConfig(wave);
            const hint = getWaveHint(waveConfig);
            if (hint.threatLabels.length === 0 && hint.radarSuggestions.length === 0 && hint.batterySuggestions.length === 0) return null;
            return (
              <div className="text-amber-200 text-sm space-y-1.5 animate-pulse">
                <p className="font-medium">💡 בגל הזה יופיעו:</p>
                <p className="text-amber-300/95">{hint.threatLabels.join(' · ')}</p>
                {hint.radarSuggestions.length > 0 && (
                  <p>רדאר מומלץ: {hint.radarSuggestions.join(', ')}</p>
                )}
                {hint.batterySuggestions.length > 0 && (
                  <p>מערכות יירוט מומלצות: {hint.batterySuggestions.join(', ')}</p>
                )}
              </div>
            );
          })()}
          <Button
            size="sm"
            className="bg-game-accent hover:bg-game-accent/80 text-game-panel font-bold w-full"
            onClick={() => {
              startWaveFromPreparation();
              soundManager.play('waveComplete');
            }}
          >
            <Play className="h-4 w-4 ml-2" />
            התחל התקפה
          </Button>
        </div>
      )}
      
      {/* Action Bar */}
      {(phase === 'playing' || phase === 'preparation') && (
        <ActionBar
          budget={budget}
          laserUnlocked={laserUnlocked}
          wave={wave}
          placingBatteryType={placingBatteryType}
          placingRadarType={placingRadarType}
          selectedBattery={selectedBattery}
          onSelectBatteryType={startPlacingBattery}
          onSelectRadarType={startPlacingRadar}
          onCancel={cancelPlacement}
        />
      )}
      
      {/* Battery Info – רק לסוללות עם סוג מוכר (מונע מסך כחול ריק) */}
      <AnimatePresence>
        {selectedBattery && (phase === 'playing' || phase === 'preparation') && ['shortRange', 'mediumRange', 'longRange', 'laser', 'thaad', 'david', 'arrow2'].includes(selectedBattery.type) && (
          <BatteryInfo
            battery={selectedBattery}
            budget={budget}
            ammoPool={ammoPool}
            onReload={reloadBattery}
            onClose={() => selectBattery(null)}
          />
        )}
      </AnimatePresence>
      
      {/* Wave Complete Modal */}
      <WaveCompleteModal
        isOpen={phase === 'waveComplete'}
        wave={wave}
        onOpenShop={openShop}
        onNextWave={() => {
          nextWave();
          soundManager.play('waveComplete');
        }}
      />
      
      {/* Shop Modal */}
      <ShopModal
        isOpen={phase === 'shop'}
        budget={budget}
        diamonds={diamonds}
        morale={morale}
        wave={wave}
        upgrades={upgrades}
        laserUnlocked={laserUnlocked}
        storyChapterId={storyChapterId}
        onPurchaseUpgrade={purchaseUpgrade}
        onUnlockLaser={unlockLaser}
        onPurchaseMoraleBoost={purchaseMoraleBoost}
        onBuyBudgetWithDiamonds={buyBudgetWithDiamonds}
        hasThaadBatteries={batteries.some(b => b.type === 'thaad')}
        hasThaadNeedingAmmo={batteries.some(b => b.type === 'thaad' && (b.ammo ?? 0) < (b.maxAmmo ?? getGameConfig().THAAD?.maxAmmo ?? 20))}
        onBuyThaadAmmo={useGameStore.getState().buyThaadAmmo}
        thaadUpgradePurchased={(useGameStore.getState().thaadExtraAmmo ?? 0) > 0}
        onPurchaseThaadUpgrade={useGameStore.getState().purchaseThaadUpgrade}
        onNextWave={() => {
          nextWave();
          soundManager.play('waveComplete');
        }}
        onClose={() => setPhase('waveComplete')}
      />
      
      {/* Game Over Modal */}
      <GameOverModal
        isOpen={phase === 'gameOver'}
        score={score}
        wavesCompleted={stats.totalWavesCompleted}
        interceptions={stats.totalInterceptions}
        highScore={stats.highScore}
        isNewHighScore={score === stats.highScore && score > 0}
        onPlayAgain={startGame}
      />
      
      {/* Placement instruction - moved to side, responsive */}
      {(placingBatteryType || placingRadarType) && (
        <div className="absolute top-20 right-2 sm:top-24 sm:right-4 z-[1000] animate-fade-in-up">
          <div className="bg-game-panel/95 backdrop-blur-sm text-game-text px-3 py-2 sm:px-4 rounded-xl shadow-xl border border-amber-400/50 max-w-[240px]">
            <p className="text-sm font-medium text-amber-200">
              {placingBatteryType ? '🎯 הצבת סוללה' : '📡 הצבת רדאר'}
            </p>
            <p className="text-xs text-gray-300 mt-1">לחץ על המפה בתוך שטח ישראל</p>
            <p className="text-xs text-gray-400 mt-0.5">לא קרוב מדי לסוללה או לעיר • ESC לביטול</p>
          </div>
        </div>
      )}
      
      {/* Combo Display */}
      {phase === 'playing' && (
        <ComboDisplay combo={combo.current} maxCombo={combo.max} />
      )}
      
      {/* Achievement Toast */}
      <AchievementToast 
        achievementId={pendingAchievement} 
        onComplete={() => setPendingAchievement(null)} 
      />
      
      {/* Random Event Notification – toast hides after 2.5s; effect stays active in store until duration (e.g. 30s) expires */}
      <EventNotification 
        event={activeEvent} 
        onComplete={() => {}}
      />
      
      {/* Error Toast */}
      <ErrorToast />
    </div>
  );
}
