/**
 * The Living Journal - Procedural Web Audio Synthesizer
 * Zero external audio files. 100% synthesized in real-time.
 * High fidelity, spatial stereo panning, zero network latency.
 */

class JournalSoundEngine {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = false;
  private lastPenScratchTime: number = 0;

  constructor() {
    // Audio starts disabled per prompt specifications
    this.isEnabled = false;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled && !this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended' && enabled) {
      this.ctx.resume();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  private initContext() {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      this.ctx = new AudioCtx();
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.isEnabled) return null;
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Metallic Brass Clasp Click / Release
   */
  public playClaspClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Metallic ping oscillator 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2850, now);
    osc1.frequency.exponentialRampToValueAtTime(1400, now + 0.06);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    // Harmonic ring
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(4200, now);
    osc2.frequency.exponentialRampToValueAtTime(2100, now + 0.05);
    gain2.gain.setValueAtTime(0.09, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    // Mechanical snap (short noise burst)
    const bufferSize = ctx.sampleRate * 0.03;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2200;
    noiseFilter.Q.value = 3;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.08);
    osc2.start(now);
    osc2.stop(now + 0.08);
    noise.start(now);
    noise.stop(now + 0.04);
  }

  /**
   * Realistic Paper Turn with Stereo Panning
   */
  public playPaperTurn(direction: 'left' | 'right' = 'right') {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.38;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Organic crackle/rustle noise profile
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.sin(Math.PI * t);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Sweeping bandpass filter to mimic paper bending through air
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.2;
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(1900, now + duration * 0.4);
    filter.frequency.exponentialRampToValueAtTime(450, now + duration);

    // Subtle low-pass smoothing
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(2600, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Stereo Panning Node
    const panNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panNode) {
      panNode.pan.setValueAtTime(direction === 'left' ? -0.55 : 0.55, now);
      noise.connect(filter);
      filter.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(panNode);
      panNode.connect(ctx.destination);
    } else {
      noise.connect(filter);
      filter.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(ctx.destination);
    }

    noise.start(now);
    noise.stop(now + duration + 0.02);
  }

  /**
   * Fountain Pen Nib Scratch against Paper
   */
  public playPenScratch() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Throttle scratching so rapid typing produces gentle organic friction
    if (now - this.lastPenScratchTime < 0.075) return;
    this.lastPenScratchTime = now;

    const duration = 0.035 + Math.random() * 0.025;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Nib frequency resonance (3000Hz - 6000Hz)
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200 + Math.random() * 1200, now);
    filter.Q.value = 4.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration + 0.01);
  }

  /**
   * Heavy Leather Book Closing Thud on Walnut Wood
   */
  public playBookThud() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Deep sub-impact
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.28);
    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    // Leather contact dampening
    const bufferSize = Math.floor(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
    noise.start(now);
    noise.stop(now + 0.16);
  }

  /**
   * Wax Seal Stamp Placement
   */
  public playWaxStamp() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.12);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Vintage Lamp Switch Click
   */
  public playLampClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.025);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // --- Rain Ambiance Synthesizer ---
  private rainSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;

  public startRainAudio() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.rainSource) return;

    // 2-second looped pink/brown noise
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.2);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    this.rainSource = source;
    this.rainGain = gain;
  }

  public stopRainAudio() {
    if (!this.ctx || !this.rainGain || !this.rainSource) return;
    const now = this.ctx.currentTime;
    this.rainGain.gain.setValueAtTime(this.rainGain.gain.value, now);
    this.rainGain.gain.linearRampToValueAtTime(0.001, now + 0.8);
    setTimeout(() => {
      if (this.rainSource) {
        this.rainSource.stop();
        this.rainSource.disconnect();
        this.rainSource = null;
        this.rainGain = null;
      }
    }, 850);
  }

  /**
   * Secret Celestial Chord (Fountain Pen Whisper)
   */
  public playSecretWhisper() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C Major shimmering arpeggio

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.06);
      gain.gain.setValueAtTime(0.06, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 1.3);
    });
  }
}

export const soundEngine = new JournalSoundEngine();
