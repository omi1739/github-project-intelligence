import type { AiSettings, ExtensionSettings } from '../models/types';

const SETTINGS_KEY = 'gpi.settings';
const CACHE_PREFIX = 'gpi.cache.';

export const DEFAULT_AI: AiSettings = {
  enabled: false,
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: '',
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  githubToken: '',
  cacheTtlMinutes: 30,
  ai: DEFAULT_AI,
};

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

export async function getSettings(): Promise<ExtensionSettings> {
  if (!hasChromeStorage()) return { ...DEFAULT_SETTINGS, ai: { ...DEFAULT_AI } };
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  const value = stored[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined;
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    ai: { ...DEFAULT_AI, ...(value?.ai ?? {}) },
  };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  if (!hasChromeStorage()) return;
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

interface CacheEntry<T> {
  savedAt: number;
  ttlMs: number;
  value: T;
}

export async function readCache<T>(key: string): Promise<T | null> {
  if (!hasChromeStorage()) return null;
  const stored = await chrome.storage.local.get(CACHE_PREFIX + key);
  const entry = stored[CACHE_PREFIX + key] as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.savedAt > entry.ttlMs) {
    await chrome.storage.local.remove(CACHE_PREFIX + key);
    return null;
  }
  return entry.value;
}

export async function writeCache<T>(key: string, value: T, ttlMinutes: number): Promise<void> {
  if (!hasChromeStorage()) return;
  const entry: CacheEntry<T> = {
    savedAt: Date.now(),
    ttlMs: Math.max(1, ttlMinutes) * 60_000,
    value,
  };
  await chrome.storage.local.set({ [CACHE_PREFIX + key]: entry });
}

export async function clearCache(): Promise<void> {
  if (!hasChromeStorage()) return;
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((key) => key.startsWith(CACHE_PREFIX));
  if (keys.length > 0) await chrome.storage.local.remove(keys);
}
