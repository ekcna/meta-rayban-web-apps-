const STORAGE_KEY = 'yt-search-api-key';
const ENV_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export function readApiKey(): string | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // Private browsing or blocked storage — fall through to the build-time key.
  }
  return ENV_API_KEY || undefined;
}

export function saveApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Key still works for the current session via React state even if this fails.
  }
}
