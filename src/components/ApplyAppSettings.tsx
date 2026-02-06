// Applies player settings to document root (theme, design theme) so tier/theme is visible on all pages.
import { useEffect } from 'react';
import { usePlayerStore } from '@/store/playerStore';

const DEFAULT_SETTINGS = {
  theme: 'dark' as const,
  highContrast: false,
  fontSize: 'normal' as const,
  reduceMotion: false,
  designTheme: '1' as const,
};

export function ApplyAppSettings() {
  const settings = usePlayerStore((s) => s.settings) ?? DEFAULT_SETTINGS;

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

    root.classList.remove('design-theme-2', 'design-theme-3');
    const design = settings.designTheme ?? '1';
    if (design === '2') root.classList.add('design-theme-2');
    else if (design === '3') root.classList.add('design-theme-3');
  }, [settings.theme, settings.highContrast, settings.fontSize, settings.reduceMotion, settings.designTheme]);

  return null;
}
