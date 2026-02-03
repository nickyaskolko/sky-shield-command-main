// Sound Manager - מנהל סאונד עם Web Audio API
// יוצר צלילים סינתטיים ללא צורך בקבצים חיצוניים

type SoundType = 
  | 'missileLaunch'
  | 'explosion'
  | 'intercept'
  | 'alarm'
  | 'reload'
  | 'purchase'
  | 'combo'
  | 'cityHit'
  | 'waveComplete'
  | 'buttonClick'
  | 'error';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.volume;
    }
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
    }
    return this.isMuted;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  play(type: SoundType, intensity: number = 1) {
    if (this.isMuted) return;

    const ctx = this.getContext();
    const now = ctx.currentTime;

    switch (type) {
      case 'missileLaunch':
        this.playMissileLaunch(ctx, now);
        break;
      case 'explosion':
        this.playExplosion(ctx, now);
        break;
      case 'intercept':
        this.playIntercept(ctx, now);
        break;
      case 'alarm':
        this.playAlarm(ctx, now);
        break;
      case 'reload':
        this.playReload(ctx, now);
        break;
      case 'purchase':
        this.playPurchase(ctx, now);
        break;
      case 'combo':
        this.playCombo(ctx, now, intensity);
        break;
      case 'cityHit':
        this.playCityHit(ctx, now);
        break;
      case 'waveComplete':
        this.playWaveComplete(ctx, now);
        break;
      case 'buttonClick':
        this.playButtonClick(ctx, now);
        break;
      case 'error':
        this.playError(ctx, now);
        break;
    }
  }

  private playMissileLaunch(ctx: AudioContext, now: number) {
    // Whoosh sound - frequency sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    
    gain.gain.setValueAtTime(0.3 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(now);
    osc.stop(now + 0.3);
  }

  private playExplosion(ctx: AudioContext, now: number) {
    // Boom - white noise with envelope
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    
    noise.start(now);
  }

  private playIntercept(ctx: AudioContext, now: number) {
    // Hit - short ping
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    
    gain.gain.setValueAtTime(0.4 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playAlarm(ctx: AudioContext, now: number) {
    // Siren - alternating frequencies
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(600, now + 0.15);
    osc.frequency.setValueAtTime(800, now + 0.3);
    osc.frequency.setValueAtTime(600, now + 0.45);
    
    gain.gain.setValueAtTime(0.25 * this.volume, now);
    gain.gain.setValueAtTime(0.25 * this.volume, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(now);
    osc.stop(now + 0.6);
  }

  private playReload(ctx: AudioContext, now: number) {
    // Click - short metallic sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.05);
    
    gain.gain.setValueAtTime(0.3 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(now);
    osc.stop(now + 0.05);
  }

  private playPurchase(ctx: AudioContext, now: number) {
    // Cash register - ascending tones
    [0, 0.08, 0.16].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = 600 + i * 200;
      
      gain.gain.setValueAtTime(0.3 * this.volume, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.1);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.1);
    });
  }

  private playCombo(ctx: AudioContext, now: number, intensity: number) {
    // Powerup - higher pitch with combo level
    const baseFreq = 400 + Math.min(intensity, 20) * 50;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + 0.15);
    
    gain.gain.setValueAtTime(0.35 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playCityHit(ctx: AudioContext, now: number) {
    // Impact - low rumble with high attack
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
    
    gain.gain.setValueAtTime(0.5 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(now);
    osc.stop(now + 0.5);
  }

  private playWaveComplete(ctx: AudioContext, now: number) {
    // Victory fanfare - ascending chord
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const delay = i * 0.1;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.25 * this.volume, now + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    });
  }

  private playButtonClick(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = 1000;
    
    gain.gain.setValueAtTime(0.2 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(now);
    osc.stop(now + 0.03);
  }

  private playError(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(150, now + 0.1);
    
    gain.gain.setValueAtTime(0.3 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }
}

// Singleton instance
export const soundManager = new SoundManager();
