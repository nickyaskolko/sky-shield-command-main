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
    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 pb-2 sm:pb-4 pointer-events-none z-30" dir="rtl">
      <div className="flex justify-center items-center gap-2 sm:gap-3 max-w-4xl mx-auto flex-wrap">
        {isPlacing ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 sm:gap-4 bg-game-panel/95 backdrop-blur-sm rounded-xl px-4 py-2.5 sm:px-6 sm:py-3 border border-game-accent/30 pointer-events-auto shadow-lg shadow-black/25"
          >
            <span className="text-game-accent">
              {placingBatteryType ? t('hintPlaceBattery') : 'לחץ על המפה כדי למקם רדאר'}
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(); }}
              className="bg-game-danger hover:bg-game-danger/80 pointer-events-auto"
            >
              <X className="h-4 w-4 ml-1" />
              {t('cancel')}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-game-panel/95 backdrop-blur-sm rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 border border-game-accent/30 pointer-events-auto shadow-lg shadow-black/25"
          >
            {/* סוללות – תפריט נפתח */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-game-accent/40 text-game-accent hover:bg-game-accent/10 hover:border-game-accent/60 gap-1.5"
                >
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">סוללות</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
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

            <div className="w-px h-10 bg-game-accent/30" />

            {/* רדארים – תפריט נפתח */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/60 gap-1.5"
                >
                  <Radar className="h-4 w-4" />
                  <span className="text-xs font-medium">רדארים</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
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
