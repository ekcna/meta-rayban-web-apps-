const STORAGE_KEY = 'market-finnhub-api-key';

export function readFinnhubKey(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveFinnhubKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Key still works for the current session via React state even if this fails.
  }
}
