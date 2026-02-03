// Shop Modal Component - חנות שדרוגים

import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, RefreshCw, Radio, Package, Heart, Banknote, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { t } from '@/lib/i18n/he';
import { Upgrades } from '@/lib/game/entities';
import { getGameConfig } from '@/lib/game/gameConfigLoader';
import { getNarrativeBetweenWaves } from '@/lib/game/storyMode';
import { cn } from '@/lib/utils';

interface ShopModalProps {
  isOpen: boolean;
  budget: number;
  diamonds: number;
  morale: number;
  wave: number;
  upgrades: Upgrades;
  laserUnlocked: boolean;
  onPurchaseUpgrade: (type: 'reloadSpeed' | 'radarRange' | 'maxAmmo', payWithDiamonds?: boolean) => void;
  onUnlockLaser: (payWithDiamonds?: boolean) => void;
  onPurchaseMoraleBoost: () => void;
  onBuyBudgetWithDiamonds: (diamondAmount: number) => void;
  hasThaadBatteries?: boolean;
  /** least one THAAD battery has ammo < max (מונע לחיצות חוזרות כשהכל מלא) */
  hasThaadNeedingAmmo?: boolean;
  onBuyThaadAmmo?: () => void;
  /** THAAD +5 ammo upgrade (diamonds); once per game */
  thaadUpgradePurchased?: boolean;
  onPurchaseThaadUpgrade?: () => boolean;
  onNextWave: () => void;
  onClose: () => void;
  /** In story mode: chapter id and wave just completed – show narrative between waves */
  storyChapterId?: string | null;
}

/** Shop: purchases with diamonds only (cost in diamonds) */

function costInDiamonds(budgetCost: number): number {
  return Math.ceil(budgetCost / getGameConfig().DIAMOND_TO_BUDGET_RATIO);
}

export function ShopModal({
  isOpen,
  budget,
  diamonds,
  morale,
  wave,
  upgrades,
  laserUnlocked,
  onPurchaseUpgrade,
  onUnlockLaser,
  onPurchaseMoraleBoost,
  onBuyBudgetWithDiamonds,
  hasThaadBatteries,
  hasThaadNeedingAmmo = true,
  onBuyThaadAmmo,
  thaadUpgradePurchased,
  onPurchaseThaadUpgrade,
  onNextWave,
  onClose,
  storyChapterId = null,
}: ShopModalProps) {
  const narrativeBetween = getNarrativeBetweenWaves(storyChapterId ?? null, wave);
  const canUnlockLaser = wave >= getGameConfig().LASER_UNLOCK_WAVE && !laserUnlocked;
  const moraleBoostCost = getGameConfig().MORALE_BOOST_COST_DIAMONDS ?? 3;
  const moraleBoostAmount = getGameConfig().MORALE_BOOST_AMOUNT ?? 15;
  const canBuyMorale = morale < 100 && diamonds >= moraleBoostCost;
  const budgetPerDiamond = getGameConfig().BUDGET_PER_DIAMOND ?? 200;
  const thaadAmmoCost = getGameConfig().THAAD_RELOAD_COST ?? 200;
  const thaadMaxAmmo = getGameConfig().THAAD?.maxAmmo ?? 20;
  const canBuyThaadAmmo = hasThaadBatteries && hasThaadNeedingAmmo && budget >= thaadAmmoCost && onBuyThaadAmmo;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="bg-game-panel/95 backdrop-blur-md border-game-accent/30 text-game-text max-w-lg shadow-2xl shadow-black/40"
        dir="rtl"
      >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-2xl text-game-accent text-center flex-1">
            {t('shopTitle')}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 text-game-text-dim hover:text-game-text hover:bg-game-accent/10" aria-label="סגור">
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>
        
        <div className="flex justify-center items-center gap-6 my-4 py-3 border-y border-game-accent/20">
          <div className="flex items-center gap-2">
            <span className="text-game-text-dim">יהלומים:</span>
            <span className="text-2xl font-bold text-amber-300">◆{diamonds}</span>
          </div>
        </div>
        {narrativeBetween && (
          <div className="my-3 p-3 bg-game-bg/50 border border-game-accent/20 rounded-lg">
            <p className="text-sm text-game-text leading-relaxed whitespace-pre-line">{narrativeBetween}</p>
          </div>
        )}
        <p className="text-sm text-game-text-dim text-center -mt-2">רכישה ביהלומים בלבד • תחמושת נקנית בסרגל העליון • שדרוגים חלים על הסוללות במשחק הנוכחי</p>
        <p className="text-xs text-game-text-dim text-center mt-1">יהלומים מתקבלים בהשלמת גלים, באתגרים יומיים ובפרס יומי</p>

        {/* Buy budget with diamonds */}
        <div className="flex items-center justify-between p-3 bg-game-accent/5 border border-game-accent/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-game-accent/10 rounded-lg text-game-accent">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium">קנה תקציב</h4>
              <p className="text-sm text-game-text-dim">◆1 = ₪{budgetPerDiamond.toLocaleString()} • ◆3 = ₪{(3 * budgetPerDiamond).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 3].map((n) => (
              <Button
                key={n}
                size="sm"
                onClick={() => onBuyBudgetWithDiamonds(n)}
                disabled={diamonds < n}
                variant="outline"
                className="border-amber-500 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
              >
                ◆{n}
              </Button>
            ))}
          </div>
        </div>

        {/* THAAD ammo – refill all THAAD batteries (cost in budget) */}
        {hasThaadBatteries && onBuyThaadAmmo && (
          <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-blue-300">תחמושת THAAD</h4>
                <p className="text-sm text-game-text-dim">מילוי כל סוללות THAAD ל־{thaadMaxAmmo} טילים</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={onBuyThaadAmmo}
              disabled={!canBuyThaadAmmo}
              variant="outline"
              className="border-blue-500 text-blue-300 hover:bg-blue-500/20 disabled:opacity-50 min-w-[72px]"
            >
              ₪{thaadAmmoCost.toLocaleString()}
            </Button>
          </div>
        )}

        {/* THAAD upgrade – +5 טילים לסוללות THAAD חדשות (פעם אחת במשחק) */}
        {onPurchaseThaadUpgrade && (
          <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-blue-300">שדרוג THAAD</h4>
                <p className="text-sm text-game-text-dim">+5 טילים לסוללות THAAD חדשות (משחק זה)</p>
              </div>
            </div>
            {thaadUpgradePurchased ? (
              <span className="text-game-text-dim text-sm">נרכש</span>
            ) : (
              <Button
                size="sm"
                onClick={() => onPurchaseThaadUpgrade()}
                disabled={diamonds < 5}
                variant="outline"
                className="border-amber-500 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 min-w-[72px]"
              >
                ◆5
              </Button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {/* Reload Speed – battery fire rate (time between shots) */}
          <UpgradeItem
            icon={<RefreshCw className="h-5 w-5" />}
            name={t('upgradeReloadSpeed')}
            description="קצב ירי מהיר יותר – טעינת סוללה בין ירי לירי (20% לכל רמה)"
            level={upgrades.reloadSpeed}
            maxLevel={4}
            costDiamonds={costInDiamonds(getGameConfig().UPGRADE_COSTS.reloadSpeed[upgrades.reloadSpeed] ?? 0)}
            canAffordDiamonds={diamonds >= costInDiamonds(getGameConfig().UPGRADE_COSTS.reloadSpeed[upgrades.reloadSpeed] ?? 0)}
            onPurchaseWithDiamonds={() => onPurchaseUpgrade('reloadSpeed', true)}
          />
          
          {/* Radar Range – battery engagement range (not radar detection range) */}
          <UpgradeItem
            icon={<Radio className="h-5 w-5" />}
            name={t('upgradeRadarRange')}
            description="טווח יירוט של סוללות +15% לכל רמה (לא טווח רדאר) – יירוט ממרחק גדול יותר"
            level={upgrades.radarRange}
            maxLevel={4}
            costDiamonds={costInDiamonds(getGameConfig().UPGRADE_COSTS.radarRange[upgrades.radarRange] ?? 0)}
            canAffordDiamonds={diamonds >= costInDiamonds(getGameConfig().UPGRADE_COSTS.radarRange[upgrades.radarRange] ?? 0)}
            onPurchaseWithDiamonds={() => onPurchaseUpgrade('radarRange', true)}
          />
          
          {/* Max Ammo – more ammo per battery */}
          <UpgradeItem
            icon={<Package className="h-5 w-5" />}
            name={t('upgradeMaxAmmo')}
            description="+2 תחמושת מקסימלית לכל סוללה (כיפת ברזל, פטריוט, חץ 3)"
            level={upgrades.maxAmmo}
            maxLevel={4}
            costDiamonds={costInDiamonds(getGameConfig().UPGRADE_COSTS.maxAmmo[upgrades.maxAmmo] ?? 0)}
            canAffordDiamonds={diamonds >= costInDiamonds(getGameConfig().UPGRADE_COSTS.maxAmmo[upgrades.maxAmmo] ?? 0)}
            onPurchaseWithDiamonds={() => onPurchaseUpgrade('maxAmmo', true)}
          />
          
          {/* Morale Boost – one-time purchase per shop visit */}
          <div className="flex items-center justify-between p-3 bg-game-accent/5 border border-game-accent/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-game-accent/10 rounded-lg text-game-accent">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium">שיפור מורל</h4>
                <p className="text-sm text-game-text-dim">+{moraleBoostAmount} מורל (מקסימום 100) • מורל נוכחי: {morale}</p>
              </div>
            </div>
            {morale >= 100 ? (
              <span className="text-sm text-game-text-dim px-3">מורל מקסימלי</span>
            ) : canBuyMorale ? (
              <Button
                size="sm"
                onClick={onPurchaseMoraleBoost}
                variant="outline"
                className="min-w-[80px] border-amber-500 text-amber-300 hover:bg-amber-500/20"
              >
                ◆{moraleBoostCost}
              </Button>
            ) : (
              <span className="text-sm text-game-text-dim px-2">◆{moraleBoostCost}</span>
            )}
          </div>

          {/* Laser Unlock */}
          {canUnlockLaser && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-green-900/30 border border-green-500/50 rounded-lg"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Zap className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-green-300">{t('unlockLaser')}</h4>
                    <p className="text-sm text-green-400/70">קרן לייזר – ירי רצוף, מתחמם אחרי 3 שניות (נפתח מגל 5)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {diamonds >= costInDiamonds(getGameConfig().LASER_COST) ? (
                    <Button
                      onClick={() => onUnlockLaser(true)}
                      variant="outline"
                      className="border-amber-500 text-amber-300 hover:bg-amber-500/20"
                    >
                      ◆{costInDiamonds(getGameConfig().LASER_COST)} יהלומים
                    </Button>
                  ) : (
                    <span className="text-sm text-game-text-dim">◆{costInDiamonds(getGameConfig().LASER_COST)} יהלומים נדרשים</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            size="lg"
            className="border-game-accent/40 text-game-accent hover:bg-game-accent/10"
          >
            סגור
          </Button>
          <Button
            onClick={onNextWave}
            size="lg"
            className="bg-game-accent hover:bg-game-accent/80 text-game-panel font-bold px-8"
          >
            {t('nextWave')} →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UpgradeItemProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  costDiamonds: number;
  canAffordDiamonds: boolean;
  onPurchaseWithDiamonds: () => void;
}

function UpgradeItem({
  icon,
  name,
  description,
  level,
  maxLevel,
  costDiamonds,
  canAffordDiamonds,
  onPurchaseWithDiamonds,
}: UpgradeItemProps) {
  const isMaxed = level >= maxLevel;
  
  return (
    <div className="flex items-center justify-between p-3 bg-game-accent/5 border border-game-accent/20 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-game-accent/10 rounded-lg text-game-accent">
          {icon}
        </div>
        <div>
          <h4 className="font-medium">{name}</h4>
          <p className="text-sm text-game-text-dim">{description}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 flex-wrap justify-end">
        <div className="flex gap-1">
          {Array.from({ length: maxLevel }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-4 rounded-sm",
                i < level ? "bg-game-accent" : "bg-game-accent/20"
              )}
            />
          ))}
        </div>
        
        {isMaxed ? (
          <span className="text-sm text-game-text-dim px-3">{t('maxLevel')}</span>
        ) : canAffordDiamonds ? (
          <Button
            size="sm"
            onClick={onPurchaseWithDiamonds}
            variant="outline"
            className="min-w-[80px] border-amber-500 text-amber-300 hover:bg-amber-500/20"
          >
            ◆{costDiamonds}
          </Button>
        ) : (
          <span className="text-sm text-game-text-dim px-2">◆{costDiamonds}</span>
        )}
      </div>
    </div>
  );
}
