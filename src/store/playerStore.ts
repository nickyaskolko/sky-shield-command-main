// Player Profile Store - פרופיל שחקן עם Zustand ו-localStorage
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getGameConfig } from '@/lib/game/gameConfigLoader';

export interface PermanentUpgrade {
  level: number;
  maxLevel: number;
  cost: number[]; // Cost per level
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  reward: number;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface PlayerStats {
  totalGamesPlayed: number;
  totalInterceptions: number;
  totalWavesCompleted: number;
  highestWave: number;
  highestScore: number;
  highestCombo: number;
  perfectWaves: number;
  batteriesUsed: Set<string>;
}

export interface PlayerProfile {
  // Currency
  diamonds: number;
  
  // Permanent upgrades (persist between games)
  permanentUpgrades: {
    startingBudget: PermanentUpgrade;  // +500 per level
    moraleDrain: PermanentUpgrade;     // -2 damage per level
    reloadSpeed: PermanentUpgrade;     // +10% per level
    comboWindow: PermanentUpgrade;     // +0.5s per level
  };
  
  // Cosmetics
  unlockedThemes: string[];
  unlockedSkins: string[];
  activeTheme: string;
  activeSkin: string;
  
  // Achievements
  achievements: Achievement[];
  
  // Stats
  stats: {
    totalGamesPlayed: number;
    totalInterceptions: number;
    totalWavesCompleted: number;
    highestWave: number;
    highestScore: number;
    highestCombo: number;
    perfectWaves: number;
    batteriesUsedTypes: string[];
  };
  settings: {
    volume: number;
    language: 'he' | 'en';
    theme: 'dark' | 'light';
    tutorialSeen?: boolean;
    /** הוראות משחק ראשון – הוצגו פעם אחת עם דלג; אחרי כן לא מופיעות שוב */
    firstGameInstructionsShown?: boolean;
    highContrast?: boolean;
    fontSize?: 'normal' | 'large';
    reduceMotion?: boolean;
    /** עיצוב ממשק – 1/2/3 (אדמין/תורם: בחירה לפי רול) */
    designTheme?: '1' | '2' | '3';
  };
  /** Admin only: when true, morale never causes game over */
  godMode: boolean;

  /** Daily reward: last claim date YYYY-MM-DD */
  dailyRewardLastClaimed: string | null;
  /** Current streak day 1–7 (resets if missed a day) */
  dailyRewardStreak: number;

  /** Buffs purchased for next game (main menu shop) */
  purchasedBuffs: {
    fullCoverageSeconds: number;
    extraStartingMorale: number;
  };

  /** רמת קושי: קל / רגיל / קשה – משפיע על תקציב ומורל התחלתיים */
  difficulty: 'easy' | 'normal' | 'hard';
}

// Default achievements
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'perfect_defense',
    name: '🛡️ הגנה מושלמת',
    description: 'השלם גל ללא נזק לערים',
    reward: 100,
    unlocked: false,
  },
  {
    id: 'sharpshooter',
    name: '🎯 צלף חד',
    description: 'יירט 10 איומים ברצף',
    reward: 200,
    unlocked: false,
  },
  {
    id: 'budget_master',
    name: '💰 גאון כלכלי',
    description: 'סיים גל עם 5000+ תקציב',
    reward: 150,
    unlocked: false,
  },
  {
    id: 'combo_king',
    name: '🔥 מלך הקומבו',
    description: 'הגע לקומבו 20+',
    reward: 300,
    unlocked: false,
  },
  {
    id: 'minimalist',
    name: '⚡ מינימליסט',
    description: 'שרוד 5 גלים עם בטריה אחת',
    reward: 500,
    unlocked: false,
  },
  {
    id: 'wave_10',
    name: '🌊 ותיק קרבות',
    description: 'הגע לגל 10',
    reward: 200,
    unlocked: false,
  },
  {
    id: 'all_weapons',
    name: '🔫 ארסנל מלא',
    description: 'השתמש בכל סוגי הבטריות במשחק אחד',
    reward: 250,
    unlocked: false,
  },
  {
    id: 'endless_5',
    name: '♾️ אינסופי',
    description: 'שרוד 5 גלים במצב אינסופי',
    reward: 400,
    unlocked: false,
  },
  {
    id: 'first_intercept',
    name: 'התחלה טובה',
    description: 'יירט את האיום הראשון',
    reward: 25,
    unlocked: false,
  },
  {
    id: 'combo_5',
    name: 'התחלת קומבו',
    description: 'הגע לקומבו 5',
    reward: 50,
    unlocked: false,
  },
];

const createDefaultProfile = (): PlayerProfile => ({
  diamonds: 0,
  permanentUpgrades: {
    startingBudget: { level: 0, maxLevel: 4, cost: [100, 200, 400, 800] },
    moraleDrain: { level: 0, maxLevel: 3, cost: [150, 300, 600] },
    reloadSpeed: { level: 0, maxLevel: 3, cost: [200, 400, 800] },
    comboWindow: { level: 0, maxLevel: 3, cost: [100, 200, 400] },
  },
  unlockedThemes: ['default'],
  unlockedSkins: ['classic'],
  activeTheme: 'default',
  activeSkin: 'classic',
  achievements: [...DEFAULT_ACHIEVEMENTS],
  stats: {
    totalGamesPlayed: 0,
    totalInterceptions: 0,
    totalWavesCompleted: 0,
    highestWave: 0,
    highestScore: 0,
    highestCombo: 0,
    perfectWaves: 0,
    batteriesUsedTypes: [],
  },
  settings: {
    volume: 0.5,
    language: 'he',
    theme: 'dark',
    tutorialSeen: false,
    firstGameInstructionsShown: false,
    highContrast: false,
    fontSize: 'normal',
    reduceMotion: false,
    designTheme: '1',
  },
  godMode: false,
  dailyRewardLastClaimed: null,
  dailyRewardStreak: 0,
  purchasedBuffs: { fullCoverageSeconds: 0, extraStartingMorale: 0 },
  difficulty: 'normal',
});

interface PlayerStore extends PlayerProfile {
  // Actions
  addDiamonds: (amount: number) => void;
  spendDiamonds: (amount: number) => boolean;
  purchaseUpgrade: (upgradeKey: keyof PlayerProfile['permanentUpgrades']) => boolean;
  unlockAchievement: (achievementId: string) => void;
  unlockTheme: (themeId: string, cost: number) => boolean;
  unlockSkin: (skinId: string, cost: number) => boolean;
  setActiveTheme: (themeId: string) => void;
  setActiveSkin: (skinId: string) => void;
  updateStats: (updates: Partial<PlayerProfile['stats']>) => void;
  recordBatteryUsed: (batteryType: string) => void;
  setVolume: (volume: number) => void;
  setLanguage: (language: 'he' | 'en') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setTutorialSeen: (seen: boolean) => void;
  setFirstGameInstructionsShown: (shown: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setFontSize: (v: 'normal' | 'large') => void;
  setReduceMotion: (v: boolean) => void;
  setDesignTheme: (v: '1' | '2' | '3') => void;
  setGodMode: (v: boolean) => void;
  /** Claim today's daily reward. Returns { claimed, reward?: { diamonds, day } }. */
  claimDailyReward: () => { claimed: boolean; reward?: { diamonds: number; day: number } };
  /** Whether today's daily reward can be claimed */
  canClaimDailyReward: () => boolean;
  /** Purchase full coverage for next game (main menu shop). Returns true if purchased. */
  purchaseFullCoverage: () => boolean;
  /** Purchase extra starting morale for next game. Returns true if purchased. */
  purchaseExtraStartingMorale: () => boolean;
  /** Consume full coverage seconds (use in-game). Returns true if had enough. */
  consumeFullCoverageSeconds: (seconds: number) => boolean;
  /** Consume extra morale (use in-game). Returns true if had enough. */
  consumeExtraMorale: (amount: number) => boolean;
  setDifficulty: (v: 'easy' | 'normal' | 'hard') => void;
  
  // Getters
  getStartingBudgetBonus: () => number;
  getMoraleDrainReduction: () => number;
  getReloadSpeedBonus: () => number;
  getComboWindowBonus: () => number;
  
  // Reset
  resetProfile: () => void;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      ...createDefaultProfile(),
      
      addDiamonds: (amount) => {
        set((state) => ({ diamonds: state.diamonds + amount }));
      },
      
      spendDiamonds: (amount) => {
        const { diamonds } = get();
        if (diamonds >= amount) {
          set({ diamonds: diamonds - amount });
          return true;
        }
        return false;
      },
      
      purchaseUpgrade: (upgradeKey) => {
        const { permanentUpgrades, diamonds } = get();
        const upgrade = permanentUpgrades[upgradeKey];
        
        if (upgrade.level >= upgrade.maxLevel) return false;
        
        const cost = upgrade.cost[upgrade.level];
        if (diamonds < cost) return false;
        
        set({
          diamonds: diamonds - cost,
          permanentUpgrades: {
            ...permanentUpgrades,
            [upgradeKey]: {
              ...upgrade,
              level: upgrade.level + 1,
            },
          },
        });
        
        return true;
      },
      
      unlockAchievement: (achievementId) => {
        const { achievements } = get();
        const achievement = achievements.find(a => a.id === achievementId);
        
        if (!achievement || achievement.unlocked) return;
        
        set({
          achievements: achievements.map(a =>
            a.id === achievementId
              ? { ...a, unlocked: true, unlockedAt: Date.now() }
              : a
          ),
        });
      },
      
      unlockTheme: (themeId, cost) => {
        const { unlockedThemes, diamonds } = get();
        if (unlockedThemes.includes(themeId) || diamonds < cost) return false;
        
        set({
          diamonds: diamonds - cost,
          unlockedThemes: [...unlockedThemes, themeId],
        });
        return true;
      },
      
      unlockSkin: (skinId, cost) => {
        const { unlockedSkins, diamonds } = get();
        if (unlockedSkins.includes(skinId) || diamonds < cost) return false;
        
        set({
          diamonds: diamonds - cost,
          unlockedSkins: [...unlockedSkins, skinId],
        });
        return true;
      },
      
      setActiveTheme: (themeId) => {
        const { unlockedThemes } = get();
        if (unlockedThemes.includes(themeId)) {
          set({ activeTheme: themeId });
        }
      },
      
      setActiveSkin: (skinId) => {
        const { unlockedSkins } = get();
        if (unlockedSkins.includes(skinId)) {
          set({ activeSkin: skinId });
        }
      },
      
      updateStats: (updates) => {
        set((state) => ({
          stats: { ...state.stats, ...updates },
        }));
      },
      
      recordBatteryUsed: (batteryType) => {
        const { stats } = get();
        if (!stats.batteriesUsedTypes.includes(batteryType)) {
          set({
            stats: {
              ...stats,
              batteriesUsedTypes: [...stats.batteriesUsedTypes, batteryType],
            },
          });
        }
      },
      
      setVolume: (volume) => {
        set((s) => ({
          settings: { ...s.settings, volume: Math.max(0, Math.min(1, volume)) },
        }));
      },
      setLanguage: (language) => {
        set((s) => ({ settings: { ...s.settings, language } }));
      },
      setTheme: (theme) => {
        set((s) => ({ settings: { ...s.settings, theme } }));
      },
      setTutorialSeen: (seen) => {
        set((s) => ({ settings: { ...s.settings, tutorialSeen: seen } }));
      },
      setFirstGameInstructionsShown: (shown) => {
        set((s) => ({ settings: { ...s.settings, firstGameInstructionsShown: shown } }));
      },
      setHighContrast: (v) => {
        set((s) => ({ settings: { ...s.settings, highContrast: v } }));
      },
      setFontSize: (v) => {
        set((s) => ({ settings: { ...s.settings, fontSize: v } }));
      },
      setReduceMotion: (v) => {
        set((s) => ({ settings: { ...s.settings, reduceMotion: v } }));
      },
      setDesignTheme: (v) => {
        set((s) => ({ settings: { ...s.settings, designTheme: v } }));
      },
      setGodMode: (v) => {
        set({ godMode: v });
      },

      canClaimDailyReward: () => {
        const today = new Date().toISOString().slice(0, 10);
        const { dailyRewardLastClaimed } = get();
        return dailyRewardLastClaimed !== today;
      },

      claimDailyReward: () => {
        const today = new Date().toISOString().slice(0, 10);
        const { dailyRewardLastClaimed, dailyRewardStreak } = get();
        if (dailyRewardLastClaimed === today) {
          return { claimed: false };
        }
        const rewards = [1, 2, 2, 3, 3, 4, 5] as const;
        const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        const nextStreak = dailyRewardLastClaimed === yesterday
          ? (dailyRewardStreak % 7) + 1
          : 1;
        const diamonds = rewards[nextStreak - 1] ?? 1;
        set({
          dailyRewardLastClaimed: today,
          dailyRewardStreak: nextStreak,
        });
        get().addDiamonds(diamonds);
        return { claimed: true, reward: { diamonds, day: nextStreak } };
      },

      purchaseFullCoverage: () => {
        const cost = getGameConfig().FULL_COVERAGE_COST_DIAMONDS ?? 25;
        const seconds = getGameConfig().FULL_COVERAGE_SECONDS ?? 45;
        const { diamonds, purchasedBuffs } = get();
        if (diamonds < cost) return false;
        set({ diamonds: diamonds - cost, purchasedBuffs: { ...purchasedBuffs, fullCoverageSeconds: purchasedBuffs.fullCoverageSeconds + seconds } });
        return true;
      },

      purchaseExtraStartingMorale: () => {
        const cost = getGameConfig().EXTRA_STARTING_MORALE_COST_DIAMONDS ?? 12;
        const amount = getGameConfig().EXTRA_STARTING_MORALE_AMOUNT ?? 15;
        const { diamonds, purchasedBuffs } = get();
        if (diamonds < cost) return false;
        set({ diamonds: diamonds - cost, purchasedBuffs: { ...purchasedBuffs, extraStartingMorale: (purchasedBuffs.extraStartingMorale ?? 0) + amount } });
        return true;
      },

      consumeFullCoverageSeconds: (seconds) => {
        const { purchasedBuffs } = get();
        const available = purchasedBuffs.fullCoverageSeconds ?? 0;
        if (available < seconds) return false;
        set({ purchasedBuffs: { ...purchasedBuffs, fullCoverageSeconds: available - seconds } });
        return true;
      },

      consumeExtraMorale: (amount) => {
        const { purchasedBuffs } = get();
        const available = purchasedBuffs.extraStartingMorale ?? 0;
        if (available < amount) return false;
        set({ purchasedBuffs: { ...purchasedBuffs, extraStartingMorale: available - amount } });
        return true;
      },
      setDifficulty: (v) => set({ difficulty: v }),
      
      getStartingBudgetBonus: () => {
        return get().permanentUpgrades.startingBudget.level * 500;
      },
      
      getMoraleDrainReduction: () => {
        return get().permanentUpgrades.moraleDrain.level * 2;
      },
      
      getReloadSpeedBonus: () => {
        return get().permanentUpgrades.reloadSpeed.level * 0.1;
      },
      
      getComboWindowBonus: () => {
        return get().permanentUpgrades.comboWindow.level * 0.5;
      },
      
      resetProfile: () => {
        set(createDefaultProfile());
      },
    }),
    {
      name: 'skyDefender_profile',
      partialize: (state) => ({
        diamonds: state.diamonds,
        permanentUpgrades: state.permanentUpgrades,
        unlockedThemes: state.unlockedThemes,
        unlockedSkins: state.unlockedSkins,
        activeTheme: state.activeTheme,
        activeSkin: state.activeSkin,
        achievements: state.achievements,
        stats: state.stats,
        settings: state.settings,
        godMode: state.godMode,
        dailyRewardLastClaimed: state.dailyRewardLastClaimed,
        dailyRewardStreak: state.dailyRewardStreak,
        purchasedBuffs: state.purchasedBuffs,
        difficulty: state.difficulty,
      }),
    }
  )
);
