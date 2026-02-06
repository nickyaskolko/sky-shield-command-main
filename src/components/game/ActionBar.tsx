// Action Bar – סרגל פעולות עם תפריט נפתח לסוללות ורדארים

import { motion } from 'framer-motion';
import { Target, Rocket, Zap, X, Radio, Radar, Satellite, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { t } from '@/lib/i18n/he';
import { BatteryType, Battery, RadarType, getRadarCost, getBatteryCost } from '@/lib/game/entities';
import { getGameConfig } from '@/lib/game/gameConfigLoader';
import { cn } from '@/lib/utils';

interface ActionBarProps {
  budget: number;
  laserUnlocked: boolean;
  wave: number;
  placingBatteryType: BatteryType | null;
  placingRadarType: RadarType | null;
  selectedBattery: Battery | null;
  onSelectBatteryType: (type: BatteryType) => void;
  onSelectRadarType: (type: RadarType) => void;
  onCancel: () => void;
}

const BATTERY_OPTIONS: { type: BatteryType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'shortRange', label: t('ironDome'), icon: <Target className="h-4 w-4" />, color: 'text-game-accent' },
  { type: 'mediumRange', label: t('patriot'), icon: <Rocket className="h-4 w-4" />, color: 'text-orange-400' },
  { type: 'longRange', label: t('arrow3'), icon: <Rocket className="h-4 w-4" />, color: 'text-purple-400' },
  { type: 'david', label: t('david'), icon: <Rocket className="h-4 w-4" />, color: 'text-amber-400' },
  { type: 'arrow2', label: 'חץ 2', icon: <Rocket className="h-4 w-4" />, color: 'text-violet-400' },
  { type: 'laser', label: t('laser'), icon: <Zap className="h-4 w-4" />, color: 'text-green-400' },
];

const RADAR_OPTIONS: { type: RadarType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'basic', label: 'רדאר בסיסי', icon: <Radar className="h-4 w-4" />, color: 'text-yellow-400' },
  { type: 'advanced', label: 'רדאר מתקדם', icon: <Radio className="h-4 w-4" />, color: 'text-orange-400' },
  { type: 'longRange', label: 'טווח ארוך', icon: <Satellite className="h-4 w-4" />, color: 'text-red-400' },
  { type: 'lband', label: 'L-band (חמקנים)', icon: <Radio className="h-4 w-4" />, color: 'text-cyan-400' },
  { type: 'naval', label: 'רדאר ימי', icon: <Radio className="h-4 w-4" />, color: 'text-teal-400' },
];

export function ActionBar({
  budget,
  laserUnlocked,
  wave,
  placingBatteryType,
  placingRadarType,
  onSelectBatteryType,
  onSelectRadarType,
  onCancel,
}: ActionBarProps) {
  const laserAvailable = wave >= getGameConfig().LASER_UNLOCK_WAVE;

  const isPlacing = placingBatteryType || placingRadarType;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 pb-2 sm:pb-4 pointer-events-none z-30 safe-area-bottom" dir="rtl" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="flex justify-center items-center gap-1.5 sm:gap-3 max-w-4xl mx-auto flex-wrap">
        {isPlacing ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="flex items-center gap-2 sm:gap-4 bg-game-panel/95 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 py-2 sm:px-6 sm:py-3 border border-game-accent/30 pointer-events-auto shadow-lg shadow-black/25 game-panel-elevated"
          >
            <span className="text-game-accent text-xs sm:text-sm">
              {placingBatteryType ? t('hintPlaceBattery') : 'לחץ על המפה – רדאר'}
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(); }}
              className="touch-target min-h-[40px] sm:min-h-[44px] px-2 sm:px-3 bg-game-danger hover:bg-game-danger/80 pointer-events-auto text-xs sm:text-sm"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" />
              {t('cancel')}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="flex items-center gap-1.5 sm:gap-2 bg-game-panel/95 backdrop-blur-sm rounded-lg sm:rounded-xl px-2 py-2 sm:px-4 sm:py-3 border border-game-accent/30 pointer-events-auto shadow-lg shadow-black/25 game-panel-elevated"
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-target min-h-[40px] sm:min-h-[44px] min-w-[40px] sm:min-w-[44px] px-2 sm:px-3 border-game-accent/40 text-game-accent hover:bg-game-accent/10 hover:border-game-accent/60 hover:shadow-[0_0_12px_hsl(var(--game-accent-glow)/0.3)] gap-1 sm:gap-1.5 text-xs transition-all duration-200"
                >
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="font-medium hidden sm:inline">סוללות</span>
                  <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-70 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[200px] bg-game-panel border-game-accent/30 text-game-text">
                {BATTERY_OPTIONS.map((opt) => {
                  const cost = getBatteryCost(opt.type);
                  const disabled = opt.type === 'laser'
                    ? !laserAvailable || !laserUnlocked || budget < cost
                    : budget < cost;
                  return (
                    <DropdownMenuItem
                      key={opt.type}
                      disabled={disabled}
                      onClick={() => (opt.type === 'laser' ? laserUnlocked : true) && onSelectBatteryType(opt.type)}
                      className={cn("flex items-center justify-between gap-2 cursor-pointer", opt.color)}
                    >
                      <span className="flex items-center gap-2">
                        {opt.icon}
                        <span>{opt.type === 'laser' && !laserUnlocked ? t('laserLocked') : opt.label}</span>
                      </span>
                      <span className="text-game-text-dim text-xs">₪{cost}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-8 sm:h-10 bg-game-accent/30" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-target min-h-[40px] sm:min-h-[44px] min-w-[40px] sm:min-w-[44px] px-2 sm:px-3 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/60 hover:shadow-[0_0_12px_rgba(245,158,11,0.25)] gap-1 sm:gap-1.5 text-xs transition-all duration-200"
                >
                  <Radar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="font-medium hidden sm:inline">רדארים</span>
                  <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-70 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[200px] bg-game-panel border-game-accent/30 text-game-text">
                {RADAR_OPTIONS.map((opt) => {
                  const cost = getRadarCost(opt.type);
                  const disabled = budget < cost;
                  return (
                    <DropdownMenuItem
                      key={opt.type}
                      disabled={disabled}
                      onClick={() => onSelectRadarType(opt.type)}
                      className={cn("flex items-center justify-between gap-2 cursor-pointer", opt.color)}
                    >
                      <span className="flex items-center gap-2">
                        {opt.icon}
                        <span>{opt.label}</span>
                      </span>
                      <span className="text-game-text-dim text-xs">₪{cost}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        )}
      </div>
    </div>
  );
}
