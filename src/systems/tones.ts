import Phaser from 'phaser';

/** A short synthesized blip; silent when audio is locked, muted or unavailable. */
export function tone(scene: Phaser.Scene, frequency: number, duration = 0.12, type: OscillatorType = 'sine', volume = 0.025): void {
  const sound = scene.sound;
  if (!(sound instanceof Phaser.Sound.WebAudioSoundManager) || sound.mute) return;
  const { context } = sound;
  if (context.state !== 'running') return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume * sound.volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.01);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
