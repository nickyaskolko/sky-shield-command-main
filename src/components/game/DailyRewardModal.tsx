// Daily Reward Modal – פרס יומי

import { useState, useRef, useEffect } from 'react';
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
import { Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REWARDS = [1, 2, 2, 3, 3, 4, 5] as const;

export function DailyRewardModal({ isOpen, onClose }: DailyRewardModalProps) {
  const [claimedToday, setClaimedToday] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canClaim = usePlayerStore((s) => s.canClaimDailyReward());
  const claimDailyReward = usePlayerStore((s) => s.claimDailyReward);
  const dailyRewardLastClaimed = usePlayerStore((s) => s.dailyRewardLastClaimed);
  const dailyRewardStreak = usePlayerStore((s) => s.dailyRewardStreak);
  const diamonds = usePlayerStore((s) => s.diamonds);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const rewards = (getGameConfig().DAILY_REWARD_DIAMONDS ?? REWARDS) as number[];
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const nextDay = dailyRewardLastClaimed === yesterday
    ? (dailyRewardStreak % 7) + 1
    : 1;

  const handleClaim = () => {
    const result = claimDailyReward();
    if (result.claimed && result.reward) {
      analytics.dailyRewardClaim(result.reward.day, result.reward.diamonds);
      setClaimedToday(true);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        onClose();
      }, 1500);
    }
  };

  const showClaimed = claimedToday || !canClaim;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-game-panel/95 border-game-accent/30 text-game-text max-w-md"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-game-accent text-center flex items-center justify-center gap-2">
            <Gift className="h-6 w-6" />
            פרס יומי
          </DialogTitle>
        </DialogHeader>
        <p className="text-game-text-dim text-sm text-center mb-4">
          היכנס כל יום וקבל יהלומים • יהלומים נוכחיים: <span className="text-amber-300 font-bold">◆{diamonds}</span>
        </p>

        <div className="grid grid-cols-7 gap-2 mb-6">
          {(rewards.length >= 7 ? rewards.slice(0, 7) : [...REWARDS]).map((d, i) => {
            const day = i + 1;
            const isNext = day === nextDay && canClaim;
            return (
              <div
                key={day}
                className={cn(
                  'rounded-lg border p-2 text-center',
                  isNext && 'border-amber-500 bg-amber-500/20 ring-2 ring-amber-400',
                  !isNext && 'border-game-accent/20 bg-game-accent/5'
                )}
              >
                <div className="text-xs text-game-text-dim mb-0.5">יום {day}</div>
                <div className="font-bold text-amber-300">◆{d}</div>
              </div>
            );
          })}
        </div>

        {showClaimed ? (
          <p className="text-center text-game-text-dim text-sm">
            {claimedToday ? 'נטלת את הפרס! תודה' : 'נטלת פרס היום • חזור מחר לפרס הבא'}
          </p>
        ) : (
          <Button
            onClick={handleClaim}
            className="w-full bg-amber-500 hover:bg-amber-600 text-game-panel font-bold"
          >
            קבל פרס – ◆{rewards[nextDay - 1] ?? 1} יהלומים (יום {nextDay})
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
