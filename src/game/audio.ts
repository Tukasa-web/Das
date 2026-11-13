type SfxName =
  | 'jump'
  | 'jump_big'
  | 'coin'
  | 'bump'
  | 'brick_break'
  | 'powerup_appear'
  | 'powerup'
  | 'oneup'
  | 'stomp'
  | 'kick'
  | 'fireball'
  | 'hurt'
  | 'death'
  | 'flagpole'
  | 'stage_clear';

const OVERWORLD_MELODY = [
  659, 0, 659, 0, 523, 659, 784, 0,
  587, 0, 494, 0, 440, 0, 392, 0,
  523, 0, 659, 0, 784, 880, 784, 659,
  587, 659, 523, 0, 392, 0, 0, 0,
];

const OVERWORLD_BASS = [
  131, 0, 196, 0, 131, 0, 196, 0,
  147, 0, 196, 0, 110, 0, 196, 0,
  131, 0, 196, 0, 165, 0, 196, 0,
  147, 0, 196, 0, 131, 0, 196, 0,
];

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private bgmEnabled = true;
  private bgmTimer: number | null = null;
  private bgmPlaying = false;
  private stepIndex = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.clearTimer();
    } else if (this.bgmEnabled && this.bgmPlaying) {
      this.startBgm();
    }
  }

  public setBgmEnabled(enabled: boolean) {
    this.bgmEnabled = enabled;
    if (!enabled) {
      this.clearTimer();
    } else if (!this.muted && this.bgmPlaying) {
      this.startBgm();
    }
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'square',
    gainPeak = 0.12,
    delay = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoise(duration: number, gainPeak = 0.12) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainPeak, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    source.stop(now + duration + 0.01);
  }

  public playSfx(name: SfxName) {
    if (this.muted) return;
    switch (name) {
      case 'jump':
        this.playTone(280, 560, 0.13, 'square', 0.09);
        break;
      case 'jump_big':
        this.playTone(190, 440, 0.16, 'square', 0.1);
        break;
      case 'coin':
        this.playTone(987.77, 987.77, 0.07, 'square', 0.1, 0);
        this.playTone(1318.51, 1318.51, 0.24, 'square', 0.1, 0.065);
        break;
      case 'bump':
        this.playTone(140, 80, 0.08, 'triangle', 0.14);
        break;
      case 'brick_break':
        this.playNoise(0.14, 0.16);
        this.playTone(180, 65, 0.12, 'square', 0.09);
        break;
      case 'powerup_appear':
        this.playTone(330, 660, 0.18, 'triangle', 0.12);
        break;
      case 'powerup':
        [523, 659, 784, 1046, 1318].forEach((n, i) =>
          this.playTone(n, n, 0.07, 'square', 0.09, i * 0.05)
        );
        break;
      case 'oneup':
        [330, 392, 659, 523, 587, 784].forEach((n, i) =>
          this.playTone(n, n, 0.08, 'square', 0.1, i * 0.065)
        );
        break;
      case 'stomp':
        this.playTone(420, 120, 0.1, 'square', 0.11);
        break;
      case 'kick':
        this.playTone(240, 520, 0.09, 'triangle', 0.14);
        break;
      case 'fireball':
        this.playTone(620, 210, 0.09, 'sawtooth', 0.08);
        break;
      case 'hurt':
        this.playTone(400, 140, 0.25, 'sawtooth', 0.11);
        break;
      case 'death':
        [523, 494, 466, 440, 392, 330, 262].forEach((n, i) =>
          this.playTone(n, n * 0.96, 0.11, 'square', 0.1, i * 0.09)
        );
        break;
      case 'flagpole':
        this.playTone(784, 262, 0.45, 'square', 0.09);
        break;
      case 'stage_clear':
        [
          { f: 523, d: 0.1, t: 0 },
          { f: 659, d: 0.1, t: 0.1 },
          { f: 784, d: 0.1, t: 0.2 },
          { f: 1046, d: 0.22, t: 0.3 },
          { f: 784, d: 0.1, t: 0.55 },
          { f: 1046, d: 0.42, t: 0.68 },
        ].forEach((n) => this.playTone(n.f, n.f, n.d, 'square', 0.1, n.t));
        break;
    }
  }

  private clearTimer() {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  public startBgm() {
    this.bgmPlaying = true;
    this.clearTimer();
    if (this.muted || !this.bgmEnabled) return;

    this.stepIndex = 0;
    this.bgmTimer = window.setInterval(() => {
      if (this.muted || !this.bgmEnabled) return;
      const idx = this.stepIndex % OVERWORLD_MELODY.length;
      const m = OVERWORLD_MELODY[idx];
      const b = OVERWORLD_BASS[idx];
      if (m > 0) this.playTone(m, m, 0.11, 'square', 0.032);
      if (b > 0) this.playTone(b, b, 0.12, 'triangle', 0.055);
      this.stepIndex++;
    }, 145);
  }

  public stopBgm() {
    this.bgmPlaying = false;
    this.clearTimer();
  }
}

export const audio = new RetroAudioEngine();
