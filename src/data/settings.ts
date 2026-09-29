// Player settings kept apart from the game save, so starting over keeps them.
const SETTINGS_KEY = 'whispers-of-evervale-settings';
const DEFAULT_VOLUME = 1;

export function loadVolume(): number {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? 'null');
    const volume = typeof value === 'object' && value !== null && 'volume' in value ? value.volume : undefined;
    return typeof volume === 'number' && volume >= 0 && volume <= 1 ? volume : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function storeVolume(volume: number): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ volume: Math.min(1, Math.max(0, volume)) }));
  } catch {
    // Storage can be unavailable (private mode); the volume still applies for this session.
  }
}
