// HUD Component - סרגל סטטיסטיקות עליון

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { t } from '@/lib/i18n/he';
import { GameNotification, getReloadCost } from '@/lib/game/entities';
import { cn } from '@/lib/utils';

export type AmmoPoolProp = { shortRange: number; mediumRange: number; longRange: number };

interface HUDProps {
  budget: number;
  diamonds?: number;
  wave: number;
  score: number;
  morale: number;
  isEndless: boolean;
  notifications: GameNotification[];
  combo?: number;
  ammoPool?: AmmoPoolProp;
  onBuyAmmo?: (type: 'shortRange' | 'mediumRange' | 'longRange', amount?: number) => void;
  /** Active threats in play – ties interceptions to visible count */
  activeThreats?: number;
  /** Seconds remaining of full radar coverage (main menu shop buff) */
  fullCoverageRemaining?: number;
}

function HUDInner({ budget, diamonds = 0, wave, score, morale, isEndless, notifications, combo = 0, ammoPool = { shortRange: 0, mediumRange: 0, longRange: 0 }, onBuyAmmo, activeThreats, fullCoverageRemaining = 0 }: HUDProps) {
  const ammoIronDome = ammoPool.shortRange;
  const ammoPatriot = ammoPool.mediumRange;
  const ammoArrow3 = ammoPool.longRange;
  const costIron = getReloadCost('shortRange');
  const costPatriot = getReloadCost('mediumRange');
  const costArrow = getReloadCost('longRange');
  const isMoraleLow = morale <= 30;
  const isMoraleCritical = morale <= 15;
  
  return (
    <div className="absolute inset-0 pointer-events-none z-10" dir="rtl">
      {/* Left: Morale – responsive: avoid overlap on small screens */}
      <div className="hud-morale absolute top-4 left-4 sm:left-20 md:left-40 lg:left-80 flex items-center gap-2 sm:gap-3 bg-game-panel/90 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 border border-game-accent/30 min-w-[100px] sm:min-w-[180px] shadow-lg shadow-black/20">
        <span className="text-game-text-dim text-sm">{t('morale')}</span>
        <div className="flex-1 min-w-0">
          <motion.div
            className={cn(
              "h-3 rounded-full overflow-hidden",
              isMoraleCritical ? "bg-game-danger/30" : isMoraleLow ? "bg-game-warning/30" : "bg-game-accent/20"
            )}
            animate={isMoraleLow ? { 
              boxShadow: ['0 0 10px hsla(0, 100%, 50%, 0.5)', '0 0 20px hsla(0, 100%, 50%, 0.3)'],
            } : {}}
            transition={{ repeat: Infinity, duration: 0.5, repeatType: 'reverse' }}
          >
            <motion.div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isMoraleCritical 
                  ? "bg-game-danger" 
                  : isMoraleLow 
                    ? "bg-game-warning" 
                    : "bg-game-accent"
              )}
              style={{ width: `${Math.min(100, morale)}%` }}
            />
          </motion.div>
        </div>
        <span className={cn(
          "font-mono text-sm min-w-[40px] text-left shrink-0",
          isMoraleCritical ? "text-game-danger" : isMoraleLow ? "text-game-warning" : "text-game-text"
        )}>
          {morale}%
        </span>
      </div>

      {/* Center: Budget + Ammo + Wave (+ full coverage badge) – responsive flex-wrap */}
      <div className="hud-center absolute top-4 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-[95vw] pointer-events-none">
        {fullCoverageRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-600 border-2 border-amber-400 rounded-lg px-4 py-2 text-white text-sm font-bold shrink-0 shadow-lg"
          >
            כיסוי מלא {Math.ceil(fullCoverageRemaining)}s
          </motion.div>
        )}
        <motion.div 
          className="flex items-center gap-2 bg-game-panel/90 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 border border-game-accent/30 shrink-0 shadow-lg shadow-black/20"
          animate={{ 
            borderColor: budget < 100 ? 'hsl(0, 70%, 50%)' : 'hsla(185, 100%, 50%, 0.3)' 
          }}
        >
          <span className="text-game-accent font-bold text-xl">₪</span>
          <motion.span 
            className="text-game-text font-mono text-lg"
            key={budget}
            initial={{ scale: 1.2, color: 'hsl(120, 100%, 50%)' }}
            animate={{ scale: 1, color: 'hsl(185, 50%, 90%)' }}
            transition={{ duration: 0.3 }}
          >
            {budget.toLocaleString()}
          </motion.span>
        </motion.div>
        <div className="flex items-center gap-2 bg-game-panel/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-amber-500/30 shrink-0 shadow-lg shadow-black/20">
          <span className="text-amber-300 font-bold text-lg">◆</span>
          <span className="text-game-text font-mono text-lg">{diamonds}</span>
        </div>
        <div className="hud-ammo-panel flex flex-col gap-1.5 bg-game-panel/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-game-accent/30 pointer-events-auto shadow-lg shadow-black/20" dir="rtl">
          <span className="text-game-text-dim text-xs font-medium">מלאי טילים</span>
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-game-accent shrink-0">כיפת ברזל <span className="text-game-text-dim text-xs">₪{costIron}</span></span>
              <span className="font-mono text-game-text">{ammoIronDome}</span>
              {onBuyAmmo && (
                <button type="button" onClick={() => onBuyAmmo('shortRange')} disabled={budget < costIron} className="touch-target text-xs px-3 py-2 min-h-[44px] rounded bg-game-accent/20 text-game-accent hover:bg-game-accent/30 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed">קנה</button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-orange-400 shrink-0">פטריוט <span className="text-game-text-dim text-xs">₪{costPatriot}</span></span>
              <span className="font-mono text-game-text">{ammoPatriot}</span>
              {onBuyAmmo && (
                <button type="button" onClick={() => onBuyAmmo('mediumRange')} disabled={budget < costPatriot} className="touch-target text-xs px-3 py-2 min-h-[44px] rounded bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed">קנה</button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-purple-400 shrink-0">חץ 3 <span className="text-game-text-dim text-xs">₪{costArrow}</span></span>
              <span className="font-mono text-game-text">{ammoArrow3}</span>
              {onBuyAmmo && (
                <button type="button" onClick={() => onBuyAmmo('longRange')} disabled={budget < costArrow} className="touch-target text-xs px-3 py-2 min-h-[44px] rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed">קנה</button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-game-panel/90 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 border border-game-accent/30 shrink-0 shadow-lg shadow-black/20">
          <span className="text-game-text-dim text-sm">{t('wave')}</span>
          <span className="text-game-accent font-bold text-xl">
            {wave}
            {isEndless && <span className="text-xs mr-1">∞</span>}
          </span>
        </div>
      </div>

      {/* Right top: Score, active threats, combo – responsive padding */}
      <div className="absolute top-4 right-2 sm:right-4 flex items-center gap-2 sm:gap-3 bg-game-panel/90 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 border border-game-accent/30 shadow-lg shadow-black/20">
        <div className="flex items-center gap-2">
          <span className="text-game-text-dim text-sm">{t('score')}</span>
          <span className="text-game-text font-mono text-lg">{score.toLocaleString()}</span>
        </div>
        {typeof activeThreats === 'number' && (
          <>
            <div className="w-px h-6 bg-game-accent/30" />
            <div className="flex items-center gap-1">
              <span className="text-game-text-dim text-xs">איומים פעילים</span>
              <span className="text-game-text font-mono text-sm">{activeThreats}</span>
            </div>
          </>
        )}
        {combo > 0 && (
          <>
            <div className="w-px h-6 bg-game-accent/30" />
            <motion.div className="flex items-center gap-1" initial={{ scale: 1.3 }} animate={{ scale: 1 }} key={combo}>
              <span className="text-orange-400 font-bold">x{combo}</span>
              <span className="text-orange-300 text-xs">🔥</span>
            </motion.div>
          </>
        )}
      </div>
      
      {/* Notifications – left middle, responsive */}
      <div className="fixed left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-start gap-2 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto overflow-x-hidden py-1 px-2 min-w-0">
        <AnimatePresence>
          {notifications
            .filter(n => (n.duration ?? 3000) > 0 && Date.now() - n.timestamp < (n.duration ?? 3000))
            .map(notification => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className={cn(
                "px-4 py-2 rounded-lg backdrop-blur-sm border font-medium shrink-0",
                notification.type === 'success' && "bg-green-900/80 border-green-500/50 text-green-300",
                notification.type === 'warning' && "bg-yellow-900/80 border-yellow-500/50 text-yellow-300",
                notification.type === 'danger' && "bg-red-900/80 border-red-500/50 text-red-300",
                notification.type === 'info' && "bg-game-panel/80 border-game-accent/50 text-game-accent"
              )}
            >
              {notification.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}

export const HUD = memo(HUDInner);
