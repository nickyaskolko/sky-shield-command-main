// Sound manager hook - מנהל סאונד עם Web Audio API
import { useCallback } from 'react';
import { soundManager } from '@/lib/audio/SoundManager';

export function useSoundManager() {
  const playMissileLaunch = useCallback(() => {
    soundManager.play('missileLaunch');
  }, []);
  
  const playInterceptSound = useCallback(() => {
    soundManager.play('intercept');
  }, []);
  
  const playExplosionSound = useCallback(() => {
    soundManager.play('explosion');
  }, []);
  
  const playAlertSound = useCallback(() => {
    soundManager.play('alarm');
  }, []);
  
  const playBuildSound = useCallback(() => {
    soundManager.play('purchase');
  }, []);
  
  const playWaveCompleteJingle = useCallback(() => {
    soundManager.play('waveComplete');
  }, []);
  
  const playButtonClick = useCallback(() => {
    soundManager.play('buttonClick');
  }, []);
  
  const playError = useCallback(() => {
    soundManager.play('error');
  }, []);
  
  const playReload = useCallback(() => {
    soundManager.play('reload');
  }, []);
  
  const playCityHit = useCallback(() => {
    soundManager.play('cityHit');
  }, []);
  
  const playCombo = useCallback((comboLevel: number) => {
    soundManager.play('combo', comboLevel);
  }, []);
  
  const setVolume = useCallback((volume: number) => {
    soundManager.setVolume(volume);
  }, []);
  
  const toggleMute = useCallback(() => {
    return soundManager.toggleMute();
  }, []);
  
  const isMuted = useCallback(() => {
    return soundManager.getMuted();
  }, []);
  
  return {
    playMissileLaunch,
    playInterceptSound,
    playExplosionSound,
    playAlertSound,
    playBuildSound,
    playWaveCompleteJingle,
    playButtonClick,
    playError,
    playReload,
    playCityHit,
    playCombo,
    setVolume,
    toggleMute,
    isMuted,
  };
}
