// Achievement Toast - הודעת הישג חדש
import { motion, AnimatePresence } from 'framer-motion';
import { getAchievementById } from '@/lib/game/achievements';

interface AchievementToastProps {
  achievementId: string | null;
  onComplete: () => void;
}

export function AchievementToast({ achievementId, onComplete }: AchievementToastProps) {
  const achievement = achievementId ? getAchievementById(achievementId) : null;
  
  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          onAnimationComplete={() => {
            setTimeout(onComplete, 2000);
          }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none max-w-[90vw]"
        >
          <div className="bg-gradient-to-r from-yellow-900/90 to-amber-800/90 
                          border border-yellow-500/50 rounded-xl px-3 py-2
                          backdrop-blur-md shadow-xl shadow-black/30">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{achievement.icon}</span>
              <div className="text-right">
                <div className="text-[10px] text-yellow-300/80">הישג חדש!</div>
                <div className="text-sm font-bold text-yellow-100">{achievement.name}</div>
                <div className="text-xs text-yellow-200/70 line-clamp-1">{achievement.description}</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
