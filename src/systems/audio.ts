/// <reference types="vite/client" />
import Phaser from 'phaser';
import { cues, soundscapes, type CueDefinition } from '../data/audio';
import { loadSettings, storeSettings, type AudioSettings } from '../data/settings';

type Bus = 'music' | 'ambience' | 'effects';
type Bed = { source: AudioBufferSourceNode; gain: GainNode };
const mixers = new WeakMap<Phaser.Sound.BaseSoundManager, AudioMixer>();

/** One mixer on Phaser's existing context, feeding its master volume/mute destination. */
export function audio(scene: Phaser.Scene): AudioMixer {
  let mixer = mixers.get(scene.sound);
  if (!mixer) { mixer = new AudioMixer(scene.sound); mixers.set(scene.sound, mixer); }
  return mixer;
}
export function cue(scene: Phaser.Scene, name: string, volume = 1): void { audio(scene).cue(name, volume); }
export function duck(scene: Phaser.Scene, amount: number): void { audio(scene).duck(amount); }
export function atmosphere(scene: Phaser.Scene, profile: string): void { audio(scene).atmosphere(scene, profile); }

export class AudioMixer {
  readonly settings = loadSettings();
  private readonly context?: AudioContext;
  private readonly buses = new Map<Bus, GainNode>();
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly last = new Map<string, number>();
  private readonly scenes = new Map<Phaser.Scene, string>();
  private beds: Bed[] = [];
  private profile = '';
  private voices = 0;
  private attenuation = 1;
  private unlocked = false;
  private readonly limiter?: DynamicsCompressorNode;

  constructor(private readonly sound: Phaser.Sound.BaseSoundManager) {
    sound.volume = this.settings.volume;
    sound.mute = this.settings.muted;
    if (!(sound instanceof Phaser.Sound.WebAudioSoundManager)) return;
    this.context = sound.context;
    this.limiter = this.context.createDynamicsCompressor();
    this.limiter.threshold.value = -12;
    this.limiter.knee.value = 12;
    this.limiter.ratio.value = 8;
    this.limiter.connect(sound.destination);
    for (const bus of ['music', 'ambience', 'effects'] as const) {
      const gain = this.context.createGain();
      gain.gain.value = this.settings[bus];
      gain.connect(this.limiter);
      this.buses.set(bus, gain);
    }
    window.addEventListener('pointerdown', this.unlock, true);
    window.addEventListener('keydown', this.unlock, true);
    window.addEventListener('blur', this.blur);
    window.addEventListener('focus', this.focus);
    sound.game.events.once(Phaser.Core.Events.DESTROY, () => {
      window.removeEventListener('pointerdown', this.unlock, true);
      window.removeEventListener('keydown', this.unlock, true);
      window.removeEventListener('blur', this.blur);
      window.removeEventListener('focus', this.focus);
      for (const bed of this.beds) { bed.source.stop(); bed.gain.disconnect(); }
      for (const bus of this.buses.values()) bus.disconnect();
      this.limiter?.disconnect();
    });
  }

  set(key: keyof AudioSettings, value: number | boolean): void {
    if (key === 'muted') this.settings.muted = value === true;
    else if (typeof value === 'number' && Number.isFinite(value)) this.settings[key] = Math.max(0, Math.min(1, value));
    this.sound.volume = this.settings.volume;
    this.sound.mute = this.settings.muted;
    this.mix();
    storeSettings(this.settings);
  }

  private unlock = (event: Event): void => {
    if (!event.isTrusted || !this.context || this.context.state === 'closed') return;
    void this.context.resume().then(() => {
      if (this.context?.state !== 'running') return;
      const first = !this.unlocked;
      this.unlocked = true;
      this.transition();
      if (first) this.cue('ui-select');
    }).catch(() => { /* Browser may deny resume; the next gesture retries. */ });
  };
  private blur = (): void => { this.mix(true); };
  private focus = (): void => { this.mix(); };
  private mix(silent = !document.hasFocus()): void {
    if (!this.context) return;
    for (const [name, bus] of this.buses) {
      const value = silent ? 0 : this.settings[name] * (name === 'effects' ? 1 : this.attenuation);
      bus.gain.cancelAndHoldAtTime(this.context.currentTime);
      bus.gain.linearRampToValueAtTime(value, this.context.currentTime + .08);
    }
  }
  duck(amount: number): void { this.attenuation = Math.max(0, Math.min(1, amount)); this.mix(); }

  atmosphere(scene: Phaser.Scene, profile: string): void {
    if (!soundscapes[profile]) return;
    const first = !this.scenes.has(scene);
    if (!first && this.scenes.get(scene) === profile) return;
    this.scenes.set(scene, profile);
    if (first) {
      const resume = (): void => { const p = this.scenes.get(scene); if (p) { this.scenes.delete(scene); this.scenes.set(scene, p); } this.duck(1); this.transition(); };
      scene.events.on(Phaser.Scenes.Events.RESUME, resume);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { scene.events.off(Phaser.Scenes.Events.RESUME, resume); this.scenes.delete(scene); this.duck(1); this.transition(); });
    }
    this.transition();
  }

  private transition(): void {
    const context = this.context;
    // Registration happens during create(), before Phaser marks a scene active.
    const profile = [...this.scenes.values()].at(-1) ?? '';
    if (!context || !this.unlocked || context.state !== 'running' || !profile || profile === this.profile) return;
    const now = context.currentTime;
    for (const bed of this.beds) {
      bed.gain.gain.cancelAndHoldAtTime(now);
      bed.gain.gain.linearRampToValueAtTime(0, now + 1.2);
      bed.source.stop(now + 1.3);
    }
    this.beds = [];
    this.profile = profile;
    if (!profile) return;
    for (const bus of ['music', 'ambience'] as const) {
      const key = `${profile}-${bus}`;
      let buffer = this.buffers.get(key);
      if (!buffer) { buffer = this.makeBed(profile, bus); this.buffers.set(key, buffer); }
      const source = context.createBufferSource();
      source.buffer = buffer; source.loop = true;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(1, now + 1.4);
      source.connect(gain); gain.connect(this.buses.get(bus)!);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      source.start(now, now % buffer.duration);
      this.beds.push({ source, gain });
    }
  }

  cue(name: string, volume = 1): void {
    const definition = cues[name];
    if (!definition) { if (import.meta.env.DEV) console.warn(`Unknown audio cue: ${name}`); return; }
    const now = this.context?.currentTime ?? 0;
    if (now - (this.last.get(name) ?? -Infinity) < (definition.cooldown ?? 80) / 1000) return;
    this.last.set(name, now);
    this.play(definition, name === 'kick' ? 'music' : 'effects', volume, name);
  }

  tone(frequency: number, duration: number, volume: number): void {
    const now = this.context?.currentTime ?? 0;
    if (now - (this.last.get('tone') ?? -Infinity) < .035) return;
    this.last.set('tone', now);
    this.play({ frequency, duration, level: volume }, 'effects');
  }

  private play(definition: CueDefinition, bus: Bus, volume = 1, key = ''): void {
    const context = this.context;
    if (!context || !this.unlocked || context.state !== 'running' || this.sound.mute || this.sound.volume === 0 || !this.settings[bus] || this.voices >= 16 || !document.hasFocus()) return;
    let buffer = this.buffers.get(key);
    if (!buffer) { buffer = this.makeCue(definition, key); if (key) this.buffers.set(key, buffer); }
    const source = context.createBufferSource(); source.buffer = buffer;
    source.playbackRate.value = .97 + Math.random() * .06;
    const gain = context.createGain(); gain.gain.value = Math.max(0, Math.min(1, volume)) * (.92 + Math.random() * .08);
    source.connect(gain); gain.connect(this.buses.get(bus)!);
    this.voices++;
    source.onended = () => { this.voices--; source.disconnect(); gain.disconnect(); };
    source.start();
  }

  private makeCue(d: CueDefinition, name: string): AudioBuffer {
    const rate = 22050;
    const buffer = this.context!.createBuffer(1, Math.ceil(d.duration * rate), rate);
    const samples = buffer.getChannelData(0);
    let phase = 0, filtered = 0;
    const notes = d.notes ?? [1];
    for (let i = 0; i < samples.length; i++) {
      const t = i / rate, progress = t / d.duration;
      const n = Math.min(notes.length - 1, Math.floor(progress * notes.length));
      const local = (progress * notes.length) % 1;
      const frequency = (d.frequency + ((d.end ?? d.frequency) - d.frequency) * progress) * notes[n]!;
      phase += 2 * Math.PI * frequency / rate;
      filtered += ((Math.random() * 2 - 1) - filtered) * .38;
      const noise = d.noise ?? 0;
      const envelope = Math.min(1, local * d.duration * 180) * Math.pow(1 - local, 2);
      const vocal = name.startsWith('cat-') || name === 'neigh' || name === 'dog-bark';
      const vibrato = vocal ? .9 * Math.sin(t * (name === 'neigh' ? 48 : 22)) : .16 * Math.sin(t * 42);
      const voiced = Math.sin(phase + vibrato) + (vocal ? .4 : .18) * Math.sin(phase * 2) + (vocal ? .2 * Math.sin(phase * 3) : 0);
      const breath = name === 'snort' || name === 'dog-pant' ? .4 + .6 * Math.sin(t * 26) ** 2 : 1;
      samples[i] = d.level * envelope * breath * (voiced * (1 - noise) + filtered * noise * 2);
    }
    return buffer;
  }

  private makeBed(profile: string, bus: 'music' | 'ambience'): AudioBuffer {
    const p = soundscapes[profile]!;
    const rate = 22050, seconds = p.pace * 32;
    const buffer = this.context!.createBuffer(1, Math.ceil(rate * seconds), rate);
    const samples = buffer.getChannelData(0);
    const melody = [0, 7, 12, 4, 9, 7, 4, 2, 0, 4, 7, 12, 9, 4, 2, 7];
    let air = 0;
    for (let i = 0; i < samples.length; i++) {
      const t = i / rate;
      if (bus === 'music') {
        const beat = Math.floor(t / p.pace), local = t % p.pace;
        const f = p.root * 2 ** (melody[beat % melody.length]! / 12);
        const env = Math.min(1, local / .035) * Math.exp(-local * (p.club ? 5 : 2));
        const note = Math.sin(2 * Math.PI * f * local) + .22 * Math.sin(2 * Math.PI * f * 2 * local);
        samples[i] = env * note * (p.club ? .023 : .028);
      } else {
        air += ((Math.random() * 2 - 1) - air) * (p.water ? .08 : .018);
        const edge = Math.min(1, t / .3, (seconds - t) / .3);
        let value = air * p.air * (1 + .25 * Math.sin(2 * Math.PI * t / seconds * 3));
        if (p.night) value += Math.sin(t * 2 * Math.PI * 2800) * Math.max(0, Math.sin(t * 9)) ** 12 * .0018;
        if (!p.indoor && !p.night) {
          const chirp = t % 7.3;
          if (chirp < .24) value += Math.sin(2 * Math.PI * (1800 * chirp + 1400 * chirp * chirp)) * Math.sin(chirp / .24 * Math.PI) * .005;
        }
        samples[i] = value * edge;
      }
    }
    return buffer;
  }
}
