// Wave configuration - הגדרות גלים

import { ThreatType } from './entities';

export interface WaveConfig {
  wave: number;
  threats: ThreatSpawn[];
  spawnInterval: number; // ms between spawns
  description: string;
}

export interface ThreatSpawn {
  type: ThreatType;
  count: number;
  delay: number; // ms from wave start
}

// Pre-configured waves 1-10: start easy, ramp difficulty and variety with wave number
export const WAVES: WaveConfig[] = [
  // Wave 1 - Very light: 2 rockets only, slow spawn
  {
    wave: 1,
    threats: [
      { type: 'rocket', count: 2, delay: 0 },
    ],
    spawnInterval: 4500,
    description: 'גל ראשון - טילים מעזה, לבנון וסוריה',
  },
  // Wave 2 - Still light
  {
    wave: 2,
    threats: [
      { type: 'rocket', count: 3, delay: 0 },
    ],
    spawnInterval: 3800,
    description: 'עוד טילים רגילים',
  },
  // Wave 3 - Rockets + first cruise (Patriot)
  {
    wave: 3,
    threats: [
      { type: 'rocket', count: 3, delay: 0 },
      { type: 'cruise', count: 1, delay: 4000 },
    ],
    spawnInterval: 3200,
    description: 'טיל שיוט ראשון',
  },
  // Wave 4 - Rockets + cruise (no ballistic yet; gives time to buy Arrow 3 + long-range radar)
  {
    wave: 4,
    threats: [
      { type: 'rocket', count: 4, delay: 0 },
      { type: 'cruise', count: 1, delay: 2000 },
    ],
    spawnInterval: 2600,
    description: 'טיל שיוט וטילים רגילים',
  },
  // Wave 5 - Rockets + drones + helicopters + cruise + first ballistic (Arrow 3)
  {
    wave: 5,
    threats: [
      { type: 'rocket', count: 4, delay: 0 },
      { type: 'drone', count: 2, delay: 0 },
      { type: 'helicopter', count: 1, delay: 2500 },
      { type: 'cruise', count: 1, delay: 4000 },
      { type: 'ballistic', count: 1, delay: 5000 },
    ],
    spawnInterval: 2200,
    description: 'טילים ומסוקים – טיל בליסטי ראשון!',
  },
  // Wave 6 - More variety: rockets + fighter + ballistic
  {
    wave: 6,
    threats: [
      { type: 'rocket', count: 5, delay: 0 },
      { type: 'drone', count: 2, delay: 0 },
      { type: 'fighter', count: 1, delay: 1500 },
      { type: 'helicopter', count: 2, delay: 3000 },
      { type: 'ballistic', count: 1, delay: 4500 },
    ],
    spawnInterval: 1800,
    description: 'מטוסי קרב וטילים!',
  },
  // Wave 7 - Rockets + cruise + glide bombs
  {
    wave: 7,
    threats: [
      { type: 'rocket', count: 5, delay: 0 },
      { type: 'drone', count: 3, delay: 0 },
      { type: 'glide_bomb', count: 2, delay: 2000 },
      { type: 'fighter', count: 2, delay: 3500 },
      { type: 'cruise', count: 2, delay: 4500 },
    ],
    spawnInterval: 1400,
    description: 'פצצות מתחלקות וטילים!',
  },
  // Wave 8 - Heavy mixed assault
  {
    wave: 8,
    threats: [
      { type: 'rocket', count: 6, delay: 0 },
      { type: 'drone', count: 4, delay: 0 },
      { type: 'helicopter', count: 2, delay: 1200 },
      { type: 'glide_bomb', count: 3, delay: 2500 },
      { type: 'ballistic', count: 2, delay: 4000 },
    ],
    spawnInterval: 1100,
    description: 'מתקפה כבדה',
  },
  // Wave 9 - Pre-finale with special threats
  {
    wave: 9,
    threats: [
      { type: 'rocket', count: 6, delay: 0 },
      { type: 'drone', count: 4, delay: 0 },
      { type: 'stealth', count: 1, delay: 800 },
      { type: 'fighter', count: 2, delay: 1500 },
      { type: 'cruise', count: 3, delay: 2200 },
      { type: 'emp', count: 1, delay: 3000 },
      { type: 'ballistic', count: 2, delay: 3800 },
    ],
    spawnInterval: 900,
    description: 'לפני הסערה - איומים מיוחדים!',
  },
  // Wave 10 - Boss wave - full variety
  {
    wave: 10,
    threats: [
      { type: 'rocket', count: 7, delay: 0 },
      { type: 'drone', count: 4, delay: 0 },
      { type: 'swarm', count: 2, delay: 300 },
      { type: 'helicopter', count: 3, delay: 800 },
      { type: 'stealth', count: 2, delay: 1200 },
      { type: 'fighter', count: 3, delay: 1600 },
      { type: 'armored', count: 1, delay: 2000 },
      { type: 'cruise', count: 4, delay: 2400 },
      { type: 'splitter', count: 2, delay: 2800 },
      { type: 'glide_bomb', count: 3, delay: 3200 },
      { type: 'ballistic', count: 3, delay: 4000 },
    ],
    spawnInterval: 650,
    description: 'הגל האחרון! 🔥',
  },
];

const MIN_SPAWN_INTERVAL = 500;
// Difficulty ramp: only reduce spawn interval from wave 4 onward, and gently
const SPAWN_INTERVAL_DECREASE_FROM_WAVE = 4;
const SPAWN_INTERVAL_DECREASE_PER_WAVE = 50;
// Threat count scale: only add extra threats from wave 5 onward, gentle
const THREAT_COUNT_SCALE_FROM_WAVE = 5;
const THREAT_COUNT_SCALE_PER_WAVE = 0.08;

export function getWaveConfig(waveNumber: number): WaveConfig {
  const safeWave = Math.max(1, Math.floor(waveNumber));
  if (safeWave <= 10) {
    const base = WAVES[safeWave - 1];
    // Early waves (1-3): use base spawn interval as-is (no extra difficulty)
    // From wave 4: slightly shorter interval as waves increase
    const wavesWithRamp = Math.max(0, safeWave - SPAWN_INTERVAL_DECREASE_FROM_WAVE);
    const spawnInterval = Math.max(
      MIN_SPAWN_INTERVAL,
      base.spawnInterval - wavesWithRamp * SPAWN_INTERVAL_DECREASE_PER_WAVE
    );
    // Early waves: no count multiplier. From wave 5: gentle increase
    const scaleWaves = Math.max(0, safeWave - THREAT_COUNT_SCALE_FROM_WAVE);
    const countMultiplier = 1 + scaleWaves * THREAT_COUNT_SCALE_PER_WAVE;
    const threats = base.threats.map(t => ({
      ...t,
      count: Math.max(1, Math.floor(t.count * countMultiplier)),
    }));
    return {
      ...base,
      wave: safeWave,
      spawnInterval,
      threats,
    };
  }

  // Endless mode - procedural generation with all threat types including specials
  const baseWave = WAVES[9]; // Use wave 10 as base
  const scaleFactor = 1 + (safeWave - 10) * 0.12;
  
  // All threat types for endless mode including specials
  const regularTypes: ThreatType[] = ['drone', 'rocket', 'cruise', 'ballistic', 'fighter', 'helicopter', 'glide_bomb'];
  const specialTypes: ThreatType[] = ['stealth', 'armored', 'swarm', 'emp', 'splitter'];
  
  // Add more specials as waves progress
  const specialCount = Math.min(specialTypes.length, Math.floor((safeWave - 10) / 2) + 1);
  const activeSpecials = specialTypes.slice(0, specialCount);

  const threats = [
    ...regularTypes.map((type, i) => ({
      type,
      count: Math.floor((3 + i) * scaleFactor),
      delay: i * 400,
    })),
    ...activeSpecials.map((type, i) => ({
      type,
      count: Math.floor(1 + (safeWave - 10) * 0.3),
      delay: 2500 + i * 300,
    })),
  ];

  return {
    wave: safeWave,
    threats,
    spawnInterval: Math.max(350, 550 - (safeWave - 10) * 15),
    description: `גל ${safeWave} - מצב אינסופי 💀`,
  };
}

export function getTotalThreatsInWave(config: WaveConfig): number {
  return config.threats.reduce((sum, t) => sum + t.count, 0);
}
