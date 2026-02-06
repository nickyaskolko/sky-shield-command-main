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
    <div className="absolute bottom-20 sm:bottom-20 left-1 sm:left-4 z-20 flex flex-col gap-1.5 sm:gap-2 pointer-events-auto max-w-[calc(100vw-2rem)] safe-area-inset-left" dir="rtl" style={{ paddingBottom: 'env(safe-area-inset-bottom)', marginLeft: 'env(safe-area-inset-left)' }}>
      <span className="text-game-text-dim text-[10px] sm:text-xs font-medium mb-0.5">באפים</span>
      <div className="flex flex-col gap-1 sm:gap-2">
        {fullAvailable && (
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/50 text-amber-200 hover:bg-amber-500/20 bg-game-panel/90 text-[10px] sm:text-xs min-h-[44px] sm:min-h-[36px] py-2 px-2"
            onClick={() => activateFullCoverage(fullSeconds)}
          >
            <Radio className="h-3 w-3 sm:h-4 sm:w-4 ml-1 shrink-0" />
            <span className="truncate">כיסוי {fullSeconds}s</span>
          </Button>
        )}
        {moraleAvailable && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-400/50 text-red-200 hover:bg-red-500/20 bg-game-panel/90 text-[10px] sm:text-xs min-h-[44px] sm:min-h-[36px] py-2 px-2"
            onClick={() => addMorale(moraleAmount)}
          >
            <Heart className="h-3 w-3 sm:h-4 sm:w-4 ml-1 shrink-0" />
            <span className="truncate">מורל +{moraleAmount}</span>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="border-blue-400/50 text-blue-200 hover:bg-blue-500/20 bg-game-panel/90 disabled:opacity-50 text-[10px] sm:text-xs min-h-[44px] sm:min-h-[36px] py-2 px-2"
          onClick={() => startPlacingBattery('thaad')}
          disabled={!canAffordThaad}
        >
          <Shield className="h-3 w-3 sm:h-4 sm:w-4 ml-1 shrink-0" />
          <span className="truncate">THAAD ₪{thaadCost.toLocaleString()}</span>
        </Button>
      </div>
    </div>
  );
}
