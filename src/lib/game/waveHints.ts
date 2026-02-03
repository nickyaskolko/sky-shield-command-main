// Wave hints – המלצות רדאר ומערכות יירוט לפי סוגי האיומים בגל

import { ThreatType } from './entities';
import { getThreatName } from './entities';
import type { WaveConfig } from './waves';

/** איזה רדאר מתאים לאיזה איום (שמות בעברית להצגה) */
const THREAT_TO_RADAR: Record<ThreatType, string[]> = {
  rocket: ['רדאר בסיסי'],
  drone: ['רדאר בסיסי'],
  cruise: ['רדאר מתקדם', 'רדאר ארוך טווח'],
  ballistic: ['רדאר ארוך טווח'],
  fighter: ['רדאר מתקדם'],
  helicopter: ['רדאר מתקדם'],
  glide_bomb: ['רדאר מתקדם'],
  stealth: ['L-band (חמקנים)'],
  armored: ['רדאר מתקדם'],
  swarm: ['רדאר בסיסי'],
  decoy: ['רדאר בסיסי'],
  emp: ['רדאר מתקדם'],
  splitter: ['רדאר מתקדם'],
};

/** איזו מערכת יירוט מתאימה לאיזה איום (שמות בעברית להצגה) */
const THREAT_TO_BATTERY: Record<ThreatType, string[]> = {
  rocket: ['כיפת ברזל', 'פטריוט'],
  drone: ['כיפת ברזל', 'פטריוט', 'THAAD'],
  cruise: ['פטריוט', 'דוד', 'חץ 2', 'THAAD'],
  ballistic: ['חץ 3', 'THAAD'],
  fighter: ['פטריוט', 'חץ 3', 'THAAD'],
  helicopter: ['פטריוט', 'חץ 3', 'THAAD'],
  glide_bomb: ['THAAD', 'לייזר'],
  stealth: ['THAAD', 'לייזר'],
  armored: ['THAAD', 'לייזר'],
  swarm: ['לייזר'],
  decoy: ['כיפת ברזל', 'פטריוט'],
  emp: ['לייזר'],
  splitter: ['THAAD', 'לייזר'],
};

export interface WaveHintResult {
  /** שמות סוגי האיומים שיופיעו בגל (בעברית, ייחודיים) */
  threatLabels: string[];
  /** רדארים מומלצים (שמות בעברית, ייחודיים) */
  radarSuggestions: string[];
  /** מערכות יירוט מומלצות (שמות בעברית, ייחודיים) */
  batterySuggestions: string[];
}

/**
 * מחזיר המלצות רלוונטיות לגל – אילו איומים יופיעו ואילו רדארים/מערכות יירוט כדאי.
 */
export function getWaveHint(config: WaveConfig): WaveHintResult {
  const threatTypes = new Set<ThreatType>();
  for (const t of config.threats) {
    threatTypes.add(t.type);
  }

  const radarSet = new Set<string>();
  const batterySet = new Set<string>();
  for (const type of threatTypes) {
    for (const r of THREAT_TO_RADAR[type] ?? []) radarSet.add(r);
    for (const b of THREAT_TO_BATTERY[type] ?? []) batterySet.add(b);
  }

  const threatLabels = [...threatTypes].map((t) => getThreatName(t));
  const radarSuggestions = [...radarSet];
  const batterySuggestions = [...batterySet];

  return { threatLabels, radarSuggestions, batterySuggestions };
}
