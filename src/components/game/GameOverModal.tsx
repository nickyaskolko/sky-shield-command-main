// Game Over Modal - מסך סוף משחק

import { motion } from 'framer-motion';
import { Trophy, Target, Waves, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { t } from '@/lib/i18n/he';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  wavesCompleted: number;
  interceptions: number;
  highScore: number;
  isNewHighScore: boolean;
  onPlayAgain: () => void;
}

export function GameOverModal({
  isOpen,
  score,
  wavesCompleted,
  interceptions,
  highScore,
  isNewHighScore,
  onPlayAgain,
}: GameOverModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="bg-game-panel/95 backdrop-blur-md border-game-danger/50 text-game-text max-w-md shadow-2xl shadow-black/40"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-3xl text-game-danger text-center">
            {t('gameOver')}
          </DialogTitle>
          <p className="text-center text-game-text-dim mt-2">{t('moraleCrashed')}</p>
        </DialogHeader>
        
        {isNewHighScore && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
            className="flex justify-center my-4"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500 rounded-full">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span className="text-yellow-400 font-bold">{t('newHighScore')}</span>
            </div>
          </motion.div>
        )}
        
        <div className="space-y-4 my-6">
          {/* Final Score */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between p-4 bg-game-accent/10 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-game-accent" />
              <span className="text-lg">{t('finalScore')}</span>
            </div>
            <span className="text-2xl font-bold text-game-accent">
              {score.toLocaleString()}
            </span>
          </motion.div>
          
          {/* Waves Completed */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between p-4 bg-purple-500/10 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Waves className="h-6 w-6 text-purple-400" />
              <span className="text-lg">{t('wavesCompleted')}</span>
            </div>
            <span className="text-2xl font-bold text-purple-400">{wavesCompleted}</span>
          </motion.div>
          
          {/* Interceptions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-green-400" />
              <span className="text-lg">{t('interceptions')}</span>
            </div>
            <span className="text-2xl font-bold text-green-400">{interceptions}</span>
          </motion.div>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button
            onClick={onPlayAgain}
            size="lg"
            className="w-full bg-game-accent hover:bg-game-accent/80 text-game-panel font-bold"
          >
            <RotateCcw className="h-5 w-5 ml-2" />
            {t('playAgain')}
          </Button>
          
          {/* Monetization placeholder */}
          <Button
            variant="outline"
            size="lg"
            className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
            onClick={() => console.log('Ad placeholder')}
          >
            {t('emergencyFunds')}
          </Button>
        </div>
        
        {/* High score display */}
        <div className="mt-4 text-center text-game-text-dim text-sm">
          שיא: {highScore.toLocaleString()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
