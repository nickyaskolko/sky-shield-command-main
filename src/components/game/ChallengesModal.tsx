// Daily & Weekly Challenges Modal – אתגרים יומיים ושבועיים

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getDailyChallenges, getWeeklyChallenges, type DailyChallenge } from '@/lib/game/dailyChallenges';

interface ChallengesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ChallengeList({ challenges, title }: { challenges: DailyChallenge[]; title: string }) {
  return (
    <>
      <h3 className="text-game-accent font-semibold text-sm mt-4 mb-2">{title}</h3>
      <ul className="space-y-3">
        {challenges.map((c) => (
          <li
            key={c.id}
            className={`p-3 rounded-lg border ${
              c.completed ? 'bg-game-success/10 border-game-success/30' : 'bg-game-bg/50 border-game-accent/20'
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="font-medium block">{c.title}</span>
                <span className="text-game-text-dim text-sm">{c.description}</span>
              </div>
              <span className="shrink-0 font-mono text-game-accent">
                {c.completed ? '✓' : `${c.progress}/${c.target}`}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ChallengesModal({ isOpen, onClose }: ChallengesModalProps) {
  const [daily, setDaily] = useState<DailyChallenge[]>([]);
  const [weekly, setWeekly] = useState<DailyChallenge[]>([]);

  useEffect(() => {
    if (isOpen) {
      getDailyChallenges()
        .then(setDaily)
        .catch(() => setDaily([]));
      getWeeklyChallenges()
        .then(setWeekly)
        .catch(() => setWeekly([]));
    } else {
      setDaily([]);
      setWeekly([]);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-game-panel/95 border-game-accent/30 text-game-text max-w-md max-h-[85vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-game-accent text-center">
            אתגרים יומיים ושבועיים
          </DialogTitle>
        </DialogHeader>
        <p className="text-game-text-dim text-sm text-center mb-2">
          השלם אתגרים במשחק גלים כדי לזכות ביהלומים
        </p>
        <ChallengeList challenges={daily} title="אתגרים יומיים" />
        <ChallengeList challenges={weekly} title="אתגרים שבועיים" />
        <div className="flex justify-center pt-4">
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
