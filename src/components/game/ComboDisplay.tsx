// Combo Display Component - תצוגת קומבו
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ComboDisplayProps {
  combo: number;
  maxCombo: number;
}

export function ComboDisplay({ combo, maxCombo }: ComboDisplayProps) {
  if (combo < 2) return null;
  
  const getComboColor = () => {
    if (combo >= 20) return 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]';
    if (combo >= 10) return 'text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.6)]';
    if (combo >= 5) return 'text-game-accent drop-shadow-[0_0_8px_rgba(0,200,255,0.5)]';
    return 'text-game-text';
  };
  
  const getComboSize = () => {
    if (combo >= 20) return 'text-4xl';
    if (combo >= 10) return 'text-3xl';
    if (combo >= 5) return 'text-2xl';
    return 'text-xl';
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={combo}
        initial={{ scale: 1.5, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -10 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          'fixed bottom-28 sm:bottom-32 right-4 sm:right-8 z-20 font-bold drop-shadow-lg',
          getComboColor(),
          getComboSize()
        )}
      >
        <div className="flex flex-col items-center">
          <motion.span
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 0.3,
              repeat: combo >= 10 ? Infinity : 0,
              repeatDelay: 0.5,
            }}
          >
            x{combo}
          </motion.span>
          <span className="text-xs text-game-text-dim opacity-70">קומבו</span>
        </div>
        
        {/* Bonus indicator */}
        {combo >= 5 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute -left-16 top-1 text-xs text-green-400"
          >
            +{Math.round(combo * 5)}% 💰
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
