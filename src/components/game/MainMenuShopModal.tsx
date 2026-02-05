// Main Menu Shop – חנות בתפריט הראשי (פריטים למשחק הבא)

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/store/playerStore';
import { getGameConfig } from '@/lib/game/gameConfigLoader';
import { analytics } from '@/lib/analytics';
import { ShoppingBag, Radio, Heart, Info } from 'lucide-react';

interface MainMenuShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MainMenuShopModal({ isOpen, onClose }: MainMenuShopModalProps) {
  const diamonds = usePlayerStore((s) => s.diamonds);
  const purchasedBuffs = usePlayerStore((s) => s.purchasedBuffs);
  const purchaseFullCoverage = usePlayerStore((s) => s.purchaseFullCoverage);
  const purchaseExtraStartingMorale = usePlayerStore((s) => s.purchaseExtraStartingMorale);

  const fullCost = getGameConfig().FULL_COVERAGE_COST_DIAMONDS ?? 25;
  const fullSeconds = getGameConfig().FULL_COVERAGE_SECONDS ?? 45;
  const moraleCost = getGameConfig().EXTRA_STARTING_MORALE_COST_DIAMONDS ?? 12;
  const moraleAmount = getGameConfig().EXTRA_STARTING_MORALE_AMOUNT ?? 15;

  const fullCoverageQueued = (purchasedBuffs?.fullCoverageSeconds ?? 0) > 0;
  const extraMoraleQueued = (purchasedBuffs?.extraStartingMorale ?? 0) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-game-panel/95 border-game-accent/30 text-game-text max-w-md max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-game-accent text-center flex items-center justify-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            חנות – פריטים למשחק הבא
          </DialogTitle>
        </DialogHeader>
        <p className="text-game-text-dim text-sm text-center mb-2">
          יהלומים נוכחיים: <span className="text-amber-300 font-bold">◆{diamonds}</span>
        </p>

        {/* Economy explanation */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 mb-4 flex gap-2">
          <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-game-text-dim">
            <p className="font-medium text-amber-200/90 mb-1">איך משיגים יהלומים?</p>
            <p>פרס יומי: 1–5 ◆ ליום • השלמת גל: ◆3 • אתגרים יומיים: ◆3. חנות השדרוגים (במשחק) זולה יותר – שדרוגים ב◆ בודדים. כאן פריטים מיוחדים למשחק הבא.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-game-accent/30 bg-game-accent/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="h-5 w-5 text-game-accent" />
              <span className="font-semibold text-game-text">כיסוי רדאר מלא</span>
            </div>
            <p className="text-game-text-dim text-sm mb-3">
              במשחק – כל האיומים מזוהים מיד (גם בלי רדאר). תבחר מתי להפעיל (כפתור "כיסוי מלא – הפעל" במשחק). משך: {fullSeconds} שניות.
            </p>
            {fullCoverageQueued && (
              <p className="text-amber-300 text-sm mb-2">
                ✓ זמין: {(purchasedBuffs?.fullCoverageSeconds ?? 0)} שניות (הפעלה במשחק)
              </p>
            )}
            <Button
              onClick={() => {
                analytics.purchase('main_shop_full_coverage', fullCost, 'diamonds');
                purchaseFullCoverage();
              }}
              disabled={diamonds < fullCost}
              className="w-full bg-amber-500 hover:bg-amber-600 text-game-panel font-bold disabled:opacity-50"
            >
              {diamonds >= fullCost
                ? `קנה ◆${fullCost} – כיסוי מלא ${fullSeconds} שניות`
                : `◆${fullCost} יהלומים נדרשים`}
            </Button>
          </div>

          <div className="rounded-xl border border-game-accent/30 bg-game-accent/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-5 w-5 text-red-400" />
              <span className="font-semibold text-game-text">בונוס מורל התחלתי</span>
            </div>
            <p className="text-game-text-dim text-sm mb-3">
              במשחק – תבחר מתי להפעיל (כפתור "בונוס מורל – הפעל"). +{moraleAmount} מורל מיד. יותר מרווח נשימה.
            </p>
            {extraMoraleQueued && (
              <p className="text-amber-300 text-sm mb-2">
                ✓ זמין: +{(purchasedBuffs?.extraStartingMorale ?? 0)} מורל (הפעלה במשחק)
              </p>
            )}
            <Button
              onClick={() => {
                analytics.purchase('main_shop_extra_morale', moraleCost, 'diamonds');
                purchaseExtraStartingMorale();
              }}
              disabled={diamonds < moraleCost}
              variant="outline"
              className="w-full border-amber-500 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
            >
              {diamonds >= moraleCost
                ? `קנה ◆${moraleCost} – +${moraleAmount} מורל`
                : `◆${moraleCost} יהלומים נדרשים`}
            </Button>
          </div>
        </div>

        <p className="text-game-text-dim text-xs text-center mt-2">
          יהלומים: השלמת גלים, אתגרים יומיים, פרס יומי.
        </p>
      </DialogContent>
    </Dialog>
  );
}
