// Wave Complete Modal - מסך סיום גל

import { motion } from 'framer-motion';
import { CheckCircle, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { t } from '@/lib/i18n/he';

interface WaveCompleteModalProps {
  isOpen: boolean;
  wave: number;
  onOpenShop: () => void;
  onNextWave: () => void;
}

export function WaveCompleteModal({
  isOpen,
  wave,
  onOpenShop,
  onNextWave,
}: WaveCompleteModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="bg-game-panel/95 backdrop-blur-md border-green-500/50 text-game-text max-w-sm shadow-2xl shadow-black/40"
        dir="rtl"
      >
        <DialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
            className="flex justify-center mb-4"
          >
            <div className="p-4 bg-green-500/20 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-400" />
            </div>
          </motion.div>
          <DialogTitle className="text-2xl text-green-400 text-center">
            {t('waveComplete')}
          </DialogTitle>
          <p className="text-center text-game-accent text-xl mt-2">
            {t('waveNumber', wave)}
          </p>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={onOpenShop}
            size="lg"
            className="w-full bg-purple-600 hover:bg-purple-500 font-bold"
          >
            <ShoppingBag className="h-5 w-5 ml-2" />
            {t('shopTitle')}
          </Button>
          
          <Button
            onClick={onNextWave}
            size="lg"
            variant="outline"
            className="w-full border-game-accent text-game-accent hover:bg-game-accent/10 font-bold"
          >
            {t('nextWave')} →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
