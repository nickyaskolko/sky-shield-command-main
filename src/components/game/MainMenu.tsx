// Main Menu Component - תפריט ראשי

import { motion } from 'framer-motion';
import { Play, Info, Heart, Settings, BarChart3, BookOpen, Trophy, LogIn, LogOut, User, Gift, ShoppingBag, MessageSquare, Users } from 'lucide-react';
import { DonorsSidebar } from './DonorsSidebar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlayerStore } from '@/store/playerStore';
import { t } from '@/lib/i18n/he';

interface MainMenuProps {
  highScore: number;
  onStartGame: () => void;
  /** If true, show "המשך משחק" and "משחק חדש"; onContinueGame restores saved game */
  hasSavedGame?: boolean;
  onContinueGame?: () => void;
  onStartStory?: () => void;
  onHowToPlay?: () => void;
  onOpenSettings?: () => void;
  onOpenStats?: () => void;
  onOpenChallenges?: () => void;
  onOpenDailyReward?: () => void;
  onOpenShop?: () => void;
  /** Logged-in user email (null = show "התחבר") */
  userEmail?: string | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  /** Whether today's daily reward can be claimed (show badge) */
  canClaimDailyReward?: boolean;
  /** Open multiplayer lobby (play with friend) */
  onOpenMultiplayer?: () => void;
}

export function MainMenu({ highScore, onStartGame, hasSavedGame, onContinueGame, onStartStory, onHowToPlay, onOpenSettings, onOpenStats, onOpenChallenges, onOpenDailyReward, onOpenShop, userEmail, onOpenAuth, onSignOut, canClaimDailyReward, onOpenMultiplayer }: MainMenuProps) {
  const difficulty = usePlayerStore((s) => s.difficulty ?? 'normal');
  const setDifficulty = usePlayerStore((s) => s.setDifficulty);
  return (
    <div className="absolute inset-0 flex flex-col z-30 overflow-hidden safe-area-padding min-h-0" dir="rtl" style={{ paddingTop: 'max(0.25rem, env(safe-area-inset-top))', paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}>
      {/* פס עליון – לוגו מקסימלי + כותרת + תיאור */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 py-3 sm:py-4 px-4 shrink-0 bg-game-panel/90 backdrop-blur-sm border-b border-game-accent/25"
      >
        <img
          src="/assets/logo.png"
          alt=""
          className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 xl:h-28 xl:w-28 object-contain flex-shrink-0"
        />
        <div className="flex flex-col items-center sm:items-start text-center sm:text-right">
          <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-[0_0_12px_hsla(185,100%,50%,0.6)] leading-tight">
            {t('gameTitle')}
          </h2>
          <p className="text-amber-100/90 text-xs sm:text-sm md:text-base mt-0.5">
            {t('gameDescription')}
          </p>
        </div>
      </motion.header>
      <div className="flex-1 relative min-h-0 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center p-1.5 sm:p-2">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col items-center w-full max-w-md min-h-0"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.25 }}
          className="w-full bg-game-panel/90 backdrop-blur-md rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 border border-game-accent/30 shadow-lg game-panel-elevated shrink-0"
        >
          <div className="space-y-1">
            {hasSavedGame && onContinueGame && (
              <Button
                onClick={onContinueGame}
                size="default"
                className="touch-target w-full bg-amber-500 hover:bg-amber-600 text-game-panel font-bold h-9 sm:h-9 text-xs sm:text-sm py-1.5"
              >
                <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1.5" />
                המשך משחק
              </Button>
            )}
            <div className="flex justify-center">
              <div className="flex items-center gap-1 sm:gap-1.5" title="משפיע על התקציב והמורל ההתחלתיים">
                <Label className="text-game-text-dim text-xs shrink-0">קושי:</Label>
                <Select value={difficulty} onValueChange={(v: 'easy' | 'normal' | 'hard') => setDifficulty(v)}>
                  <SelectTrigger className="w-[72px] sm:w-[90px] bg-game-bg/60 border-game-accent/20 text-game-text h-7 sm:h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-game-panel border-game-accent/30">
                    <SelectItem value="easy" className="text-game-text">קל</SelectItem>
                    <SelectItem value="normal" className="text-game-text">רגיל</SelectItem>
                    <SelectItem value="hard" className="text-game-text">קשה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={onStartGame}
              size="default"
              className="touch-target w-full bg-game-accent hover:bg-game-accent/85 hover:shadow-[0_0_20px_hsl(var(--game-accent-glow)/0.35)] text-game-panel font-bold h-9 text-xs sm:text-sm py-1.5 transition-all duration-200"
            >
              <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1.5" />
              {hasSavedGame ? 'משחק חדש' : 'משחק גלים'}
            </Button>

            {onStartStory && (
              <Button
                variant="outline"
                size="default"
                className="touch-target w-full border-game-accent/40 text-game-accent hover:bg-game-accent/10 h-9 text-xs py-1.5"
                onClick={onStartStory}
              >
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5" />
                מצב סיפור
              </Button>
            )}

            {onOpenMultiplayer && (
              <Button
                variant="outline"
                size="default"
                className="touch-target w-full border-amber-500/50 text-amber-300 hover:bg-amber-500/10 h-9 text-xs py-1.5"
                onClick={onOpenMultiplayer}
              >
                <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1.5" />
                משחק עם חבר
              </Button>
            )}

            {onOpenShop && (
              <Button
                variant="outline"
                size="default"
                className="touch-target w-full border-game-accent/40 text-game-accent hover:bg-game-accent/10 h-9 text-xs py-1.5"
                onClick={onOpenShop}
              >
                <ShoppingBag className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1.5" />
                חנות
              </Button>
            )}

            <div className="grid grid-cols-2 gap-1 pt-0.5">
              {onHowToPlay && (
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-target border-game-accent/40 text-game-accent hover:bg-game-accent/10 h-8 text-xs py-1"
                  onClick={onHowToPlay}
                >
                  <Info className="h-3.5 w-3.5 ml-1" />
                  {t('howToPlay')}
                </Button>
              )}
              {onOpenStats && (
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-target border-game-accent/40 text-game-accent hover:bg-game-accent/10 h-8 text-xs py-1"
                  onClick={onOpenStats}
                >
                  <BarChart3 className="h-3 w-3 ml-1" />
                  סטטיסטיקות
                </Button>
              )}
              {onOpenChallenges && (
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-target border-game-accent/40 text-game-accent hover:bg-game-accent/10 h-8 text-xs py-1"
                  onClick={onOpenChallenges}
                >
                  <Trophy className="h-3 w-3 ml-1" />
                  אתגרים
                </Button>
              )}
              {onOpenDailyReward && (
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-target border-amber-500/50 text-amber-300 hover:bg-amber-500/10 h-8 text-xs relative py-1"
                  onClick={onOpenDailyReward}
                >
                  <Gift className="h-3 w-3 ml-1" />
                  פרס יומי
                  {canClaimDailyReward && (
                    <span className="absolute -top-0.5 -left-0.5 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-500 text-game-panel text-[7px] sm:text-[8px] flex items-center justify-center font-bold">!</span>
                  )}
                </Button>
              )}
              {onOpenSettings && (
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-target col-span-2 border-game-accent/40 text-game-accent hover:bg-game-accent/10 h-8 text-xs py-1"
                  onClick={onOpenSettings}
                >
                  <Settings className="h-3 w-3 ml-1" />
                  הגדרות
                </Button>
              )}
            </div>

            {onOpenAuth && (
              userEmail ? (
                <div className="flex flex-col gap-1 pt-1.5 mt-1 border-t border-game-accent/20">
                  <p className="text-game-text-dim text-[10px] sm:text-xs truncate text-center" title={userEmail}>
                    <User className="h-2.5 w-2.5 inline ml-1" />
                    {userEmail}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-amber-500/40 text-amber-200 hover:bg-amber-500/20 h-7 text-[10px]"
                    onClick={onSignOut}
                  >
                    <LogOut className="h-2.5 w-2.5 ml-1" />
                    התנתק
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="default"
                  className="touch-target w-full border-game-accent/40 text-game-accent hover:bg-game-accent/10 h-9 text-xs py-1.5"
                  onClick={onOpenAuth}
                >
                  <LogIn className="h-3 w-3 ml-1.5" />
                  התחבר
                </Button>
              )
            )}
          </div>

          {/* High Score – inline compact */}
          {highScore > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-1.5 pt-1.5 border-t border-game-accent/20 text-center"
            >
              <span className="text-game-text-dim text-[10px]">שיא אישי: </span>
              <span className="text-game-accent font-bold text-xs">{highScore.toLocaleString()}</span>
            </motion.div>
          )}
        </motion.div>

        {/* Footer – קומפקטי */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-2 shrink-0 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
        >
          <Button
            variant="outline"
            size="sm"
            className="border-game-accent/50 text-game-accent hover:bg-game-accent/10 font-medium px-3 h-7 text-xs"
            asChild
          >
            <a
              href="https://forms.gle/r5qCehvDdsyYfggDA"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1"
            >
              <MessageSquare className="h-3 w-3" />
              הצעות למשחק
            </a>
          </Button>
          <motion.div
            animate={{ boxShadow: ['0 0 20px rgba(251,191,36,0.2)', '0 0 35px rgba(251,191,36,0.35)', '0 0 20px rgba(251,191,36,0.2)'] }}
            transition={{ delay: 0.5, duration: 1.5, repeat: 1, repeatDelay: 0.5 }}
            className="rounded-lg inline-block"
          >
            <Button
              variant="outline"
              size="sm"
              className="border-2 border-amber-400 bg-amber-500/30 text-amber-50 hover:bg-amber-500/50 hover:border-amber-300 hover:text-white font-bold text-xs px-3 h-7 shadow-lg shadow-amber-500/25"
              asChild
            >
              <a
                href="https://www.paypal.com/ncp/payment/4D3DVK3J4UUH2"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1"
              >
                <Heart className="h-3.5 w-3.5 fill-amber-300" />
                {t('supportDev')}
              </a>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 z-10">
          <DonorsSidebar />
        </div>
      </div>
    </div>
  );
}
