// Battery Info Panel - פאנל מידע סוללה

import { motion } from 'framer-motion';
import { X, RefreshCw, Trash2, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { t } from '@/lib/i18n/he';
import { Battery } from '@/lib/game/entities';
import { getGameConfig } from '@/lib/game/gameConfigLoader';
import { cn } from '@/lib/utils';

interface BatteryInfoProps {
  battery: Battery;
  budget: number;
  ammoPool?: { shortRange: number; mediumRange: number; longRange: number };
  onReload?: () => void;
  onClose: () => void;
}

function getReloadCost(type: Battery['type']): number {
  switch (type) {
    case 'shortRange': return getGameConfig().SHORT_RANGE_RELOAD_COST;
    case 'mediumRange': return getGameConfig().MEDIUM_RANGE_RELOAD_COST;
    case 'longRange': return getGameConfig().LONG_RANGE_RELOAD_COST;
    case 'thaad': return getGameConfig().THAAD_RELOAD_COST ?? 200;
    case 'david': return getGameConfig().DAVID_RELOAD_COST ?? 95;
    case 'arrow2': return getGameConfig().ARROW2_RELOAD_COST ?? 85;
    default: return 100;
  }
}

export function BatteryInfo({ battery, budget, ammoPool, onReload, onClose }: BatteryInfoProps) {
  const isLaser = battery.type === 'laser';
  const isPoolAmmo = battery.type === 'shortRange' || battery.type === 'mediumRange' || battery.type === 'longRange';
  const isProjectile = isPoolAmmo; // סוללות טיל (תחמושת ממאגר) – לא מציגות טעינה פנימית
  const poolAmmo = ammoPool && isPoolAmmo ? ammoPool[battery.type] : undefined;
  const reloadCost = getReloadCost(battery.type);
  
  const canReload = !isLaser && (isPoolAmmo ? false : ((battery.ammo ?? 0) < (battery.maxAmmo ?? 1) && budget >= reloadCost)) && !battery.isReloading;
  
  const ammoDisplay = isLaser ? null : poolAmmo !== undefined ? poolAmmo : (battery.ammo ?? 0);
  const ammoMaxDisplay = isLaser ? null : poolAmmo !== undefined ? undefined : (battery.maxAmmo ?? 0);
  const ammoPercentage = isLaser ? 100 : (ammoMaxDisplay && ammoMaxDisplay > 0 ? (ammoDisplay! / ammoMaxDisplay) * 100 : (ammoDisplay ?? 0));
  const isLowAmmo = ammoPercentage <= 30;
  
  const typeLabels: Record<Battery['type'], string> = {
    shortRange: t('ironDome'),
    mediumRange: t('patriot'),
    longRange: t('arrow3'),
    laser: t('laser'),
    thaad: 'THAAD (סיוע ברית)',
    david: t('david'),
    arrow2: t('arrow2'),
  };
  
  const typeColors: Record<Battery['type'], string> = {
    shortRange: 'text-game-accent border-game-accent',
    mediumRange: 'text-orange-400 border-orange-400',
    longRange: 'text-purple-400 border-purple-400',
    laser: 'text-green-400 border-green-400',
    thaad: 'text-blue-400 border-blue-400',
    david: 'text-amber-400 border-amber-400',
    arrow2: 'text-violet-400 border-violet-400',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-1/2 left-2 sm:left-4 -translate-y-1/2 bg-game-panel/95 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-game-accent/30 w-64 max-w-[calc(100vw-1rem)] pointer-events-auto z-20 shadow-xl shadow-black/30"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full border", typeColors[battery.type] ?? typeColors.shortRange)}>
          <span className="font-medium">{typeLabels[battery.type]}</span>
        </div>
        <button 
          onClick={onClose}
          className="touch-target min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-game-accent/20 active:scale-95 rounded-lg transition-all duration-200"
        >
          <X className="h-4 w-4 text-game-text-dim" />
        </button>
      </div>
      
      {/* Stats */}
      <div className="space-y-3">
        {/* Ammo or Heat */}
        {isLaser ? (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-game-text-dim">{t('heat')}</span>
              {battery.isOverheated && (
                <span className="text-game-danger flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  {t('overheated')}
                </span>
              )}
            </div>
            <div className="h-3 bg-game-accent/20 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  battery.isOverheated ? "bg-game-danger" : "bg-orange-500"
                )}
                style={{ width: `${(battery.heatLevel / (getGameConfig().LASER?.maxHeatTime ?? 3000)) * 100}%` }}
              />
            </div>
            {battery.isOverheated && (
              <div className="mt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-game-text-dim">{t('cooling')}</span>
                  <span className="text-game-accent">{Math.round(battery.cooldownProgress * 100)}%</span>
                </div>
                <Progress value={battery.cooldownProgress * 100} className="h-2" />
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-game-text-dim">{t('ammo')}</span>
              <span className={cn(isLowAmmo ? "text-game-danger" : "text-game-text")}>
                {poolAmmo !== undefined ? (
                  <>מהמאגר: {poolAmmo}</>
                ) : (
                  <>{battery.ammo} / {battery.maxAmmo}</>
                )}
              </span>
            </div>
            <div className="h-3 bg-game-accent/20 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  isLowAmmo ? "bg-game-danger" : "bg-game-accent"
                )}
                animate={isLowAmmo ? { opacity: [1, 0.5, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.5 }}
                style={{ width: `${poolAmmo !== undefined ? Math.min(100, (poolAmmo / 10) * 100) : ammoPercentage}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Range */}
        <div className="flex justify-between text-sm">
          <span className="text-game-text-dim">{t('range')}</span>
          <span className="text-game-text">{battery.range}px</span>
        </div>
        
        {/* Reloading indicator – only for non-pool batteries (legacy) */}
        {!isProjectile && battery.isReloading && (
          <div className="p-2 bg-game-accent/10 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="h-4 w-4 text-game-accent animate-spin" />
              <span className="text-sm text-game-accent">טוען...</span>
            </div>
            <Progress value={battery.reloadProgress * 100} className="h-2" />
          </div>
        )}
      </div>
      
      {/* Actions – reload only for non-pool; projectile ammo bought in HUD */}
      {!isLaser && !isProjectile && onReload && (
        <div className="mt-4 pt-4 border-t border-game-accent/20">
          <Button
            onClick={onReload}
            disabled={!canReload}
            className={cn(
              "w-full",
              canReload 
                ? "bg-game-accent hover:bg-game-accent/80 text-game-panel" 
                : "bg-gray-600"
            )}
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            {t('reloadButton')} (₪{reloadCost})
          </Button>
        </div>
      )}
    </motion.div>
  );
}
