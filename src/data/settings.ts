// Independent of the adventure save: New Game retains the player's mix.
const SETTINGS_KEY = 'whispers-of-evervale-settings';
export interface AudioSettings { volume: number; music: number; ambience: number; effects: number; muted: boolean }
export const defaultSettings: AudioSettings = { volume: 1, music: .65, ambience: .65, effects: .8, muted: false };
export function loadSettings(): AudioSettings {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? 'null');
    const result = { ...defaultSettings };
    if (typeof value !== 'object' || value === null) return result;
    for (const key of ['volume', 'music', 'ambience', 'effects'] as const) {
      const n = key in value ? (value as Record<string, unknown>)[key] : undefined;
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1) result[key] = n;
    }
    if ('muted' in value && typeof value.muted === 'boolean') result.muted = value.muted;
    return result;
  } catch { return { ...defaultSettings }; }
}
export function storeSettings(settings: AudioSettings): void {
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Session mix still works without storage. */ }
}
export function loadVolume(): number { return loadSettings().volume; }
export function storeVolume(volume: number): void {
  storeSettings({ ...loadSettings(), volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1 });
}
