// Event Notification Component - הודעת אירוע אקראי
import { motion, AnimatePresence } from 'framer-motion';
import { RandomEvent } from '@/lib/game/randomEvents';
import { useEffect, useState } from 'react';

interface EventNotificationProps {
  event: RandomEvent | null;
  onComplete: () => void;
}

export function EventNotification({ event, onComplete }: EventNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (event) {
      setIsVisible(true);
      let completeTimer: ReturnType<typeof setTimeout> | null = null;
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        completeTimer = setTimeout(onComplete, 400);
      }, 2500);
      return () => {
        clearTimeout(hideTimer);
        if (completeTimer != null) clearTimeout(completeTimer);
      };
    } else {
      setIsVisible(false);
    }
  }, [event, onComplete]);
  
  return (
    <AnimatePresence>
      {isVisible && event && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none max-w-[90vw]"
        >
          <div className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 
                          border border-purple-400/50 rounded-xl px-3 py-2
                          backdrop-blur-md shadow-xl shadow-black/30 min-w-[200px]">
            <div className="relative flex items-center gap-2">
              <span className="text-2xl">{event.icon}</span>
              <div>
                <div className="text-sm font-bold text-purple-100">{event.name}</div>
                <div className="text-xs text-purple-200/90 line-clamp-2">{event.description}</div>
                {event.duration && (
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-purple-300/70">
                    <span>⏱️</span>
                    <span>{Math.round(event.duration / 1000)} שניות</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
