// Settings Modal - הגדרות (עוצמת קול, שפה, נושא, עיצוב לאדמין/תורם)

import { useEffect } from 'react';
import { Volume2, Languages, Sun, Moon, Palette } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePlayerStore } from '@/store/playerStore';
import { soundManager } from '@/lib/audio/SoundManager';
import { useUserRole, maxDesignThemeOption } from '@/hooks/useUserRole';
import { t } from '@/lib/i18n/he';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const settings = usePlayerStore((s) => s.settings ?? { volume: 0.5, language: 'he', theme: 'dark', highContrast: false, fontSize: 'normal', reduceMotion: false, designTheme: '1' });
  const setVolume = usePlayerStore((s) => s.setVolume);
  const setLanguage = usePlayerStore((s) => s.setLanguage);
  const setTheme = usePlayerStore((s) => s.setTheme);
  const setHighContrast = usePlayerStore((s) => s.setHighContrast);
  const setFontSize = usePlayerStore((s) => s.setFontSize);
  const setReduceMotion = usePlayerStore((s) => s.setReduceMotion);
  const setDesignTheme = usePlayerStore((s) => s.setDesignTheme);
  const userRole = useUserRole();
  const maxTheme = maxDesignThemeOption(userRole);

  useEffect(() => {
    soundManager.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'light') root.classList.add('theme-light');
    else root.classList.remove('theme-light');
    if (settings.highContrast) root.classList.add('accessibility-high-contrast');
    else root.classList.remove('accessibility-high-contrast');
    if (settings.fontSize === 'large') root.classList.add('accessibility-large-text');
    else root.classList.remove('accessibility-large-text');
    if (settings.reduceMotion) root.classList.add('accessibility-reduce-motion');
    else root.classList.remove('accessibility-reduce-motion');
  }, [settings.theme, settings.highContrast, settings.fontSize, settings.reduceMotion]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-game-panel/95 border-game-accent/30 text-game-text max-w-md"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-game-accent text-center">
            הגדרות
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Volume */}
          <div className="flex items-center gap-4">
            <Volume2 className="h-5 w-5 text-game-accent shrink-0" />
            <div className="flex-1">
              <label className="text-sm text-game-text-dim block mb-1">עוצמת קול</label>
              <Slider
                value={[settings.volume]}
                onValueChange={([v]) => setVolume(v ?? 0.5)}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>
          </div>

          {/* Language */}
          <div className="flex items-center gap-4">
            <Languages className="h-5 w-5 text-game-accent shrink-0" />
            <div className="flex-1">
              <label className="text-sm text-game-text-dim block mb-2">שפה</label>
              <div className="flex gap-2">
                <Button
                  variant={settings.language === 'he' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLanguage('he')}
                  className={settings.language === 'he' ? 'bg-game-accent text-game-panel' : ''}
                >
                  עברית
                </Button>
                <Button
                  variant={settings.language === 'en' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLanguage('en')}
                  className={settings.language === 'en' ? 'bg-game-accent text-game-panel' : ''}
                >
                  English
                </Button>
              </div>
            </div>
          </div>

          {/* Accessibility */}
          <div className="flex items-center gap-4">
            <span className="text-game-text-dim text-sm shrink-0">נגישות</span>
            <div className="flex-1 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.highContrast ?? false}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="rounded"
                />
                ניגודיות גבוהה
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.fontSize === 'large'}
                  onChange={(e) => setFontSize(e.target.checked ? 'large' : 'normal')}
                  className="rounded"
                />
                טקסט גדול
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.reduceMotion ?? false}
                  onChange={(e) => setReduceMotion(e.target.checked)}
                  className="rounded"
                />
                הפחתת אנימציות
              </label>
            </div>
          </div>

          {/* Theme */}
          <div className="flex items-center gap-4">
            {settings.theme === 'dark' ? (
              <Moon className="h-5 w-5 text-game-accent shrink-0" />
            ) : (
              <Sun className="h-5 w-5 text-game-accent shrink-0" />
            )}
            <div className="flex-1">
              <label className="text-sm text-game-text-dim block mb-2">נושא</label>
              <div className="flex gap-2">
                <Button
                  variant={settings.theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className={settings.theme === 'dark' ? 'bg-game-accent text-game-panel' : ''}
                >
                  כהה
                </Button>
                <Button
                  variant={settings.theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  className={settings.theme === 'light' ? 'bg-game-accent text-game-panel' : ''}
                >
                  בהיר
                </Button>
              </div>
            </div>
          </div>

          {/* Design theme – אדמין/תורם בלבד */}
          {maxTheme >= 1 && (
            <div className="flex items-center gap-4">
              <Palette className="h-5 w-5 text-game-accent shrink-0" />
              <div className="flex-1">
                <label className="text-sm text-game-text-dim block mb-2">{t('designTheme')}</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={settings.designTheme === '1' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDesignTheme('1')}
                    className={settings.designTheme === '1' ? 'bg-game-accent text-game-panel' : ''}
                  >
                    {t('designTheme1')}
                  </Button>
                  {maxTheme >= 2 && (
                    <Button
                      variant={settings.designTheme === '2' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDesignTheme('2')}
                      className={settings.designTheme === '2' ? 'bg-game-accent text-game-panel' : ''}
                    >
                      {t('designTheme2')}
                    </Button>
                  )}
                  {maxTheme >= 3 && (
                    <Button
                      variant={settings.designTheme === '3' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDesignTheme('3')}
                      className={settings.designTheme === '3' ? 'bg-game-accent text-game-panel' : ''}
                    >
                      {t('designTheme3')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center pt-2">
          <Button onClick={onClose} className="bg-game-accent text-game-panel">
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
