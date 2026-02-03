// Stats Modal - סטטיסטיקות התקדמות והישגים

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePlayerStore } from '@/store/playerStore';
import { t } from '@/lib/i18n/he';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StatsModal({ isOpen, onClose }: StatsModalProps) {
  const stats = usePlayerStore((s) => s.stats);
  const achievements = usePlayerStore((s) => s.achievements);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-game-panel/95 border-game-accent/30 text-game-text max-w-lg max-h-[85vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-game-accent text-center">
            סטטיסטיקות והתקדמות
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-game-bg/80 rounded-lg p-3 border border-game-accent/20">
              <span className="text-game-text-dim text-sm block">משחקים ששוחקו</span>
              <span className="text-game-accent font-bold text-lg">{stats.totalGamesPlayed}</span>
            </div>
            <div className="bg-game-bg/80 rounded-lg p-3 border border-game-accent/20">
              <span className="text-game-text-dim text-sm block">יירוטים</span>
              <span className="text-game-accent font-bold text-lg">{stats.totalInterceptions}</span>
            </div>
            <div className="bg-game-bg/80 rounded-lg p-3 border border-game-accent/20">
              <span className="text-game-text-dim text-sm block">גלים שהושלמו</span>
              <span className="text-game-accent font-bold text-lg">{stats.totalWavesCompleted}</span>
            </div>
            <div className="bg-game-bg/80 rounded-lg p-3 border border-game-accent/20">
              <span className="text-game-text-dim text-sm block">גל מקסימלי</span>
              <span className="text-game-accent font-bold text-lg">{stats.highestWave}</span>
            </div>
            <div className="bg-game-bg/80 rounded-lg p-3 border border-game-accent/20 col-span-2">
              <span className="text-game-text-dim text-sm block">שיא ניקוד</span>
              <span className="text-game-accent font-bold text-lg">{stats.highestScore.toLocaleString()}</span>
            </div>
            <div className="bg-game-bg/80 rounded-lg p-3 border border-game-accent/20">
              <span className="text-game-text-dim text-sm block">קומבו מקסימלי</span>
              <span className="text-game-accent font-bold text-lg">{stats.highestCombo}</span>
            </div>
            <div className="bg-game-bg/80 rounded-lg p-3 border border-game-accent/20">
              <span className="text-game-text-dim text-sm block">גלים מושלמים</span>
              <span className="text-game-accent font-bold text-lg">{stats.perfectWaves}</span>
            </div>
          </div>

          {/* Achievements */}
          <div>
            <h3 className="text-game-accent font-semibold mb-2">הישגים</h3>
            <ul className="space-y-2">
              {achievements.map((a) => (
                <li
                  key={a.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    a.unlocked ? 'bg-game-success/10 border-game-success/30' : 'bg-game-bg/50 border-game-accent/20 opacity-75'
                  }`}
                >
                  <span className="shrink-0">{a.unlocked ? '✓' : '○'}</span>
                  <div className="min-w-0">
                    <span className="font-medium block">{a.name}</span>
                    <span className="text-game-text-dim text-sm">{a.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-game-accent text-game-panel font-medium"
          >
            סגור
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
