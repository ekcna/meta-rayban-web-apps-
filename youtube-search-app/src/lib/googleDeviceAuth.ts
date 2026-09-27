const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
const DEVICE_CODE_URL = 'https://oauth2.googleapis.com/device/code';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

export class DeviceAuthError extends Error {}

export interface DeviceCodeInfo {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
}

interface DeviceCodeResponse {
  device_code?: string;
  user_code?: string;
  verification_url?: string;
  expires_in?: number;
  interval?: number;
  error?: string;
  error_description?: string;
}

interface TokenPollResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      {once: true},
    );
  });
}

export async function requestDeviceCode(
  clientId: string,
  signal: AbortSignal,
): Promise<DeviceCodeInfo> {
  const response = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({client_id: clientId, scope: SCOPE}),
    signal,
  });
  const body = (await response.json()) as DeviceCodeResponse;
  if (!response.ok || !body.device_code || !body.user_code || !body.verification_url) {
    throw new DeviceAuthError(
      body.error_description ?? "Couldn't start Google sign-in. Check the device client ID.",
    );
  }
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUrl: body.verification_url,
    expiresIn: body.expires_in ?? 1800,
    interval: body.interval ?? 5,
  };
}

export async function pollForToken(
  config: {clientId: string; clientSecret: string},
  deviceCode: string,
  intervalSeconds: number,
  expiresInSeconds: number,
  signal: AbortSignal,
): Promise<string> {
  let interval = intervalSeconds;
  const deadline = Date.now() + expiresInSeconds * 1000;

  while (Date.now() < deadline) {
    await sleep(interval * 1000, signal);

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        device_code: deviceCode,
        grant_type: GRANT_TYPE,
      }),
      signal,
    });
    const body = (await response.json()) as TokenPollResponse;

    if (body.access_token) return body.access_token;

    if (body.error === 'authorization_pending') continue;
    if (body.error === 'slow_down') {
      interval += 5;
      continue;
    }
    if (body.error === 'access_denied') {
      throw new DeviceAuthError('Sign-in was declined.');
    }
    if (body.error === 'expired_token') {
      throw new DeviceAuthError('That code expired. Try again.');
    }
    throw new DeviceAuthError(body.error_description ?? 'Sign-in failed.');
  }

  throw new DeviceAuthError('That code expired. Try again.');
}
