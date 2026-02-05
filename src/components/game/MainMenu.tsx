// Main Menu Component - תפריט ראשי

import { motion } from 'framer-motion';
import { Play, Info, Heart, Settings, BarChart3, BookOpen, Trophy, LogIn, LogOut, User, Gift, ShoppingBag, MessageSquare, Users } from 'lucide-react';
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
    <div className="absolute inset-0 flex items-center justify-center z-30 p-2 sm:p-4 overflow-y-auto safe-area-padding" dir="rtl" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col items-center w-full max-w-md"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-2 sm:mb-4 rounded-xl sm:rounded-2xl border-2 border-amber-400/40 bg-gradient-to-b from-amber-500/15 to-transparent px-4 py-3 sm:px-6 sm:py-5 shadow-[0_0_30px_rgba(251,191,36,0.15)] ring-2 ring-amber-400/20 shrink-0"
        >
          <motion.h1
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="text-2xl sm:text-5xl md:text-6xl font-extrabold text-white drop-shadow-[0_0_16px_hsla(185,100%,50%,0.7)] [text-shadow:0_0_24px_hsla(185,100%,70%,0.8)] tracking-tight text-center"
          >
            {t('gameTitle')}
          </motion.h1>
          <motion.p
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="text-amber-100 text-xs sm:text-lg font-semibold mt-1.5 sm:mt-3 text-center drop-shadow-md [text-shadow:0_1px_4px_rgba(0,0,0,0.4)]"
          >
            משחק הגנת שמיים טקטי
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.25 }}
          className="w-full bg-game-panel/90 backdrop-blur-md rounded-lg sm:rounded-xl px-3 py-2 sm:px-5 sm:py-4 border border-game-accent/30 shadow-lg"
        >
          <div className="space-y-1.5 sm:space-y-2">
            {hasSavedGame && onContinueGame && (
              <Button
                onClick={onContinueGame}
                size="default"
                className="touch-target w-full bg-amber-500 hover:bg-amber-600 text-game-panel font-bold min-h-[40px] sm:min-h-[44px] text-sm sm:text-base py-2"
              >
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5" />
                המשך משחק
              </Button>
            )}
            <div className="flex justify-center">
              <div className="flex items-center gap-1.5 sm:gap-2" title="משפיע על התקציב והמורל ההתחלתיים">
                <Label className="text-game-text-dim text-xs sm:text-sm shrink-0">קושי:</Label>
                <Select value={difficulty} onValueChange={(v: 'easy' | 'normal' | 'hard') => setDifficulty(v)}>
                  <SelectTrigger className="w-[80px] sm:w-[100px] bg-game-bg/60 border-game-accent/20 text-game-text h-8 sm:h-9 text-sm">
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
              className="touch-target w-full bg-game-accent hover:bg-game-accent/85 text-game-panel font-bold min-h-[40px] sm:min-h-[44px] text-sm sm:text-base py-2"
            >
              <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5" />
              {hasSavedGame ? 'משחק חדש' : 'משחק גלים'}
            </Button>

            {onStartStory && (
              <Button
                variant="outline"
                size="default"
                className="touch-target w-full border-game-accent/40 text-game-accent hover:bg-game-accent/10 min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm py-2"
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
                className="touch-target w-full border-amber-500/50 text-amber-300 hover:bg-amber-500/10 min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm py-2"
                onClick={onOpenMultiplayer}
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5" />
                משחק עם חבר
              </Button>
            )}

            {onOpenShop && (
              <Button
                variant="outline"
                size="default"
                className="touch-target w-full border-game-accent/40 text-game-accent hover:bg-game-accent/10 min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm py-2"
                onClick={onOpenShop}
              >
                <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5" />
                חנות
              </Button>
            )}

            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-0.5">
              {onHowToPlay && (
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-target border-game-accent/40 text-game-accent hover:bg-game-accent/10 min-h-[38px] sm:min-h-[44px] text-xs sm:text-sm py-1.5"
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
                  className="touch-target border-game-accent/40 text-game-accent hover:bg-game-accent/10 min-h-[38px] sm:min-h-[44px] text-xs sm:text-sm py-1.5"
                  onClick={onOpenStats}
                >
                  <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1" />
                  סטטיסטיקות
                </Button>
              )}
              {onOpenChallenges && (
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-target border-game-accent/40 text-game-accent hover:bg-game-accent/10 min-h-[38px] sm:min-h-[44px] text-xs sm:text-sm py-1.5"
                  onClick={onOpenChallenges}
                >
                  <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1" />
                  אתגרים
                </Button>
              )}
              {onOpenDailyReward && (
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-target border-amber-500/50 text-amber-300 hover:bg-amber-500/10 min-h-[38px] sm:min-h-[44px] text-xs sm:text-sm relative py-1.5"
                  onClick={onOpenDailyReward}
                >
                  <Gift className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1" />
                  פרס יומי
                  {canClaimDailyReward && (
                    <span className="absolute -top-0.5 -left-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-500 text-game-panel text-[8px] sm:text-[10px] flex items-center justify-center font-bold">!</span>
                  )}
                </Button>
              )}
              {onOpenSettings && (
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-target col-span-2 border-game-accent/40 text-game-accent hover:bg-game-accent/10 min-h-[38px] sm:min-h-[44px] text-xs sm:text-sm py-1.5"
                  onClick={onOpenSettings}
                >
                  <Settings className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1" />
                  הגדרות
                </Button>
              )}
            </div>

            {onOpenAuth && (
              userEmail ? (
                <div className="flex flex-col gap-1.5 pt-2 mt-1 border-t border-game-accent/20">
                  <p className="text-game-text-dim text-xs truncate text-center" title={userEmail}>
                    <User className="h-3 w-3 inline ml-1" />
                    {userEmail}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-amber-500/40 text-amber-200 hover:bg-amber-500/20 h-8 text-xs"
                    onClick={onSignOut}
                  >
                    <LogOut className="h-3 w-3 ml-1" />
                    התנתק
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="default"
                  className="touch-target w-full border-game-accent/40 text-game-accent hover:bg-game-accent/10 min-h-[44px] text-sm mt-0.5"
                  onClick={onOpenAuth}
                >
                  <LogIn className="h-4 w-4 ml-1.5" />
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
              transition={{ delay: 0.3 }}
              className="mt-3 pt-2 border-t border-game-accent/20 text-center"
            >
              <span className="text-game-text-dim text-xs">שיא אישי: </span>
              <span className="text-game-accent font-bold text-sm">{highScore.toLocaleString()}</span>
            </motion.div>
          )}
        </motion.div>

        {/* Footer – הצעות למשחק + תמוך במפתח */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.85, duration: 0.4, type: 'spring', stiffness: 200 }}
          className="mt-5 shrink-0 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button
            variant="outline"
            size="default"
            className="border-game-accent/50 text-game-accent hover:bg-game-accent/10 font-semibold px-5 h-10"
            asChild
          >
            <a
              href="https://forms.gle/r5qCehvDdsyYfggDA"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              הצעות למשחק
            </a>
          </Button>
          <motion.div
            animate={{ boxShadow: ['0 0 20px rgba(251,191,36,0.2)', '0 0 35px rgba(251,191,36,0.35)', '0 0 20px rgba(251,191,36,0.2)'] }}
            transition={{ delay: 1.3, duration: 1.5, repeat: 1, repeatDelay: 0.5 }}
            className="rounded-xl inline-block"
          >
            <Button
              variant="outline"
              size="default"
              className="border-2 border-amber-400 bg-amber-500/30 text-amber-50 hover:bg-amber-500/50 hover:border-amber-300 hover:text-white font-bold text-xs sm:text-base px-4 sm:px-6 h-9 sm:h-11 shadow-xl shadow-amber-500/25"
              asChild
            >
              <a
                href="https://www.paypal.com/ncp/payment/4D3DVK3J4UUH2"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2"
              >
                <Heart className="h-5 w-5 fill-amber-300" />
                {t('supportDev')}
              </a>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
