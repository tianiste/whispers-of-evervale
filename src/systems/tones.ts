import type Phaser from 'phaser';
import { audio } from './audio';

/** Existing melodic rewards share the effects bus, limiter, mute and autoplay gate. */
export function tone(scene: Phaser.Scene, frequency: number, duration = .12, _type: OscillatorType = 'sine', volume = .025): void {
  audio(scene).tone(frequency, duration, volume);
}
