// BuffsPanel – הפעלת באפים מחנות מסך הבית + סיוע ברית (הצבת THAAD בכל גל)

import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/store/playerStore';
import { useGameStore } from '@/store/gameStore';
import { getGameConfig } from '@/lib/game/gameConfigLoader';
import { Radio, Heart, Shield } from 'lucide-react';

export function BuffsPanel() {
  const purchasedBuffs = usePlayerStore((s) => s.purchasedBuffs);
  const budget = useGameStore((s) => s.budget);
  const activateFullCoverage = useGameStore((s) => s.activateFullCoverage);
  const addMorale = useGameStore((s) => s.addMorale);
  const startPlacingBattery = useGameStore((s) => s.startPlacingBattery);

  const fullSeconds = getGameConfig().FULL_COVERAGE_SECONDS ?? 45;
  const moraleAmount = getGameConfig().EXTRA_STARTING_MORALE_AMOUNT ?? 15;
  const thaadCost = getGameConfig().THAAD_COST ?? 1200;

  const fullAvailable = (purchasedBuffs?.fullCoverageSeconds ?? 0) >= fullSeconds;
  const moraleAvailable = (purchasedBuffs?.extraStartingMorale ?? 0) >= moraleAmount;
  const canAffordThaad = budget >= thaadCost;

  return (
    <div className="absolute bottom-20 left-4 z-20 flex flex-col gap-2 pointer-events-auto" dir="rtl">
      <span className="text-game-text-dim text-xs font-medium mb-0.5">באפים וסיוע</span>
      <div className="flex flex-col gap-2">
        {fullAvailable && (
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/50 text-amber-200 hover:bg-amber-500/20 bg-game-panel/90"
            onClick={() => activateFullCoverage(fullSeconds)}
          >
            <Radio className="h-4 w-4 ml-1.5" />
            כיסוי מלא ({fullSeconds}s) – הפעל
          </Button>
        )}
        {moraleAvailable && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-400/50 text-red-200 hover:bg-red-500/20 bg-game-panel/90"
            onClick={() => addMorale(moraleAmount)}
          >
            <Heart className="h-4 w-4 ml-1.5" />
            בונוס מורל +{moraleAmount} – הפעל
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="border-blue-400/50 text-blue-200 hover:bg-blue-500/20 bg-game-panel/90 disabled:opacity-50"
          onClick={() => startPlacingBattery('thaad')}
          disabled={!canAffordThaad}
        >
          <Shield className="h-4 w-4 ml-1.5" />
          הצב THAAD (סיוע ברית) – ₪{thaadCost.toLocaleString()}
        </Button>
      </div>
    </div>
  );
}
