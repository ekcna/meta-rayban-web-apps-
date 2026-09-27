const STORAGE_KEY = 'market-alert-thresholds';

export type AlertDirection = 'above' | 'below';

export interface AlertConfig {
  threshold: number;
  direction: AlertDirection;
}

function readAll(): Record<string, AlertConfig> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, AlertConfig>) : {};
  } catch {
    return {};
  }
}

export function readAlert(symbol: string): AlertConfig | undefined {
  return readAll()[symbol];
}

export function saveAlert(symbol: string, config: AlertConfig): void {
  const all = readAll();
  all[symbol] = config;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Alert still works for the current session via React state even if this fails.
  }
}

export function clearAlert(symbol: string): void {
  const all = readAll();
  delete all[symbol];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Best effort.
  }
}
