const CLIENT_ID = '858064893968-pdi85j4d4qte8rtqvli23mosm0oqau7n.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

interface TokenResponse {
  access_token?: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken: (options?: {prompt?: string}) => void;
}

interface GoogleAccountsOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
  }) => TokenClient;
  revoke: (token: string, callback: () => void) => void;
}

declare global {
  interface Window {
    google?: {accounts: {oauth2: GoogleAccountsOAuth2}};
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the Google sign-in script.'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

let tokenClient: TokenClient | null = null;

export async function signIn(): Promise<string> {
  await loadGisScript();
  const oauth2 = window.google?.accounts.oauth2;
  if (!oauth2) throw new Error('Google sign-in is unavailable.');

  return new Promise<string>((resolve, reject) => {
    tokenClient =
      tokenClient ??
      oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: response => {
          if (response.access_token) resolve(response.access_token);
          else reject(new Error(response.error ?? 'Sign-in was cancelled.'));
        },
      });
    tokenClient.requestAccessToken();
  });
}

export function signOut(accessToken: string): void {
  window.google?.accounts.oauth2.revoke(accessToken, () => {});
}
