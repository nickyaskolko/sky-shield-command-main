// Error Toast Component - הודעת שגיאה
import { useGameStore } from '@/store/gameStore';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export function ErrorToast() {
  const errorMessage = useGameStore(state => state.errorMessage);
  const clearError = useGameStore(state => state.clearError);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        clearError();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [errorMessage, clearError]);

  return (
    <AnimatePresence>
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          className="fixed top-20 left-1/2 z-50 pointer-events-auto"
        >
          <div className="bg-destructive/95 text-destructive-foreground px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 backdrop-blur-sm border border-destructive">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium text-sm">{errorMessage}</span>
            <button
              onClick={clearError}
              className="ml-2 hover:opacity-70 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
