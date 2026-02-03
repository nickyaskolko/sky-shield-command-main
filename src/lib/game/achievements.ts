// Achievement definitions and tracking - הישגים וזיהוי שלהם

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  reward: number;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'perfect_defense',
    name: 'הגנה מושלמת',
    description: 'השלם גל ללא נזק לערים',
    reward: 100,
    icon: '🛡️',
  },
  {
    id: 'sharpshooter',
    name: 'צלף חד',
    description: 'יירט 10 איומים ברצף',
    reward: 200,
    icon: '🎯',
  },
  {
    id: 'budget_master',
    name: 'גאון כלכלי',
    description: 'סיים גל עם 5000+ תקציב',
    reward: 150,
    icon: '💰',
  },
  {
    id: 'combo_king',
    name: 'מלך הקומבו',
    description: 'הגע לקומבו 20+',
    reward: 300,
    icon: '🔥',
  },
  {
    id: 'minimalist',
    name: 'מינימליסט',
    description: 'שרוד 5 גלים עם בטריה אחת',
    reward: 500,
    icon: '⚡',
  },
  {
    id: 'wave_10',
    name: 'ותיק קרבות',
    description: 'הגע לגל 10',
    reward: 200,
    icon: '🌊',
  },
  {
    id: 'all_weapons',
    name: 'ארסנל מלא',
    description: 'השתמש בכל סוגי הבטריות במשחק אחד',
    reward: 250,
    icon: '🔫',
  },
  {
    id: 'endless_5',
    name: 'אינסופי',
    description: 'שרוד 5 גלים במצב אינסופי',
    reward: 400,
    icon: '♾️',
  },
  {
    id: 'first_intercept',
    name: 'התחלה טובה',
    description: 'יירט את האיום הראשון',
    reward: 25,
    icon: '🎖️',
  },
  {
    id: 'combo_5',
    name: 'התחלת קומבו',
    description: 'הגע לקומבו 5',
    reward: 50,
    icon: '✨',
  },
];

// Achievement checking functions
export interface AchievementContext {
  waveDamage: number;
  consecutiveInterceptions: number;
  currentBudget: number;
  currentCombo: number;
  totalWaves: number;
  batteriesCount: number;
  batteriesUsed: string[];
  isEndless: boolean;
  endlessWavesSurvived: number;
  totalInterceptions: number;
}

export function checkAchievements(
  context: AchievementContext,
  unlockedAchievements: string[]
): string[] {
  const newAchievements: string[] = [];
  
  // First intercept
  if (!unlockedAchievements.includes('first_intercept') && context.totalInterceptions >= 1) {
    newAchievements.push('first_intercept');
  }
  
  // Perfect defense (wave with no damage)
  if (!unlockedAchievements.includes('perfect_defense') && context.waveDamage === 0 && context.totalWaves >= 1) {
    newAchievements.push('perfect_defense');
  }
  
  // Sharpshooter (10 consecutive)
  if (!unlockedAchievements.includes('sharpshooter') && context.consecutiveInterceptions >= 10) {
    newAchievements.push('sharpshooter');
  }
  
  // Budget master
  if (!unlockedAchievements.includes('budget_master') && context.currentBudget >= 5000) {
    newAchievements.push('budget_master');
  }
  
  // Combo 5
  if (!unlockedAchievements.includes('combo_5') && context.currentCombo >= 5) {
    newAchievements.push('combo_5');
  }
  
  // Combo king
  if (!unlockedAchievements.includes('combo_king') && context.currentCombo >= 20) {
    newAchievements.push('combo_king');
  }
  
  // Minimalist
  if (!unlockedAchievements.includes('minimalist') && context.batteriesCount === 1 && context.totalWaves >= 5) {
    newAchievements.push('minimalist');
  }
  
  // Wave 10
  if (!unlockedAchievements.includes('wave_10') && context.totalWaves >= 10) {
    newAchievements.push('wave_10');
  }
  
  // All weapons (5 battery types)
  const allBatteryTypes = ['shortRange', 'mediumRange', 'longRange', 'laser'];
  if (!unlockedAchievements.includes('all_weapons') && 
      allBatteryTypes.every(t => context.batteriesUsed.includes(t))) {
    newAchievements.push('all_weapons');
  }
  
  // Endless 5
  if (!unlockedAchievements.includes('endless_5') && context.isEndless && context.endlessWavesSurvived >= 5) {
    newAchievements.push('endless_5');
  }
  
  return newAchievements;
}

export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}
