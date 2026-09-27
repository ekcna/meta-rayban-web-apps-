const STORAGE_KEY = 'yt-device-oauth-config';

export interface DeviceOAuthConfig {
  clientId: string;
  clientSecret: string;
}

export function readDeviceOAuthConfig(): DeviceOAuthConfig | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return undefined;
    const parsed = JSON.parse(stored) as Partial<DeviceOAuthConfig>;
    if (parsed.clientId && parsed.clientSecret) {
      return {clientId: parsed.clientId, clientSecret: parsed.clientSecret};
    }
  } catch {
    // Private browsing or blocked storage — treated as unconfigured.
  }
  return undefined;
}

export function saveDeviceOAuthConfig(config: DeviceOAuthConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Config still works for the current session via React state even if this fails.
  }
}
