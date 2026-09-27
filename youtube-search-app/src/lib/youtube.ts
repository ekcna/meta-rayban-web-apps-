export interface VideoResult {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  description: string;
  duration: string;
  viewCount: string;
}

export interface ChannelResult {
  id: string;
  title: string;
  thumbnailUrl: string;
}

export class YouTubeApiError extends Error {
  constructor(public userMessage: string) {
    super(userMessage);
    this.name = 'YouTubeApiError';
  }
}

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const MAX_RESULTS = 12;

interface SearchListItem {
  id: {videoId?: string};
}

interface VideosListItem {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    description: string;
    thumbnails: {
      medium?: {url: string};
      default?: {url: string};
    };
  };
  contentDetails: {duration: string};
  statistics: {viewCount?: string};
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: {message?: string; errors?: Array<{reason?: string}>};
    };
    const reason = body.error?.errors?.[0]?.reason;
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
      return "Search quota used up for today. Try again tomorrow, or use a different API key.";
    }
    if (reason === 'keyInvalid' || response.status === 400) {
      return 'That API key was rejected. Double-check it in wearables.config or your .env.local.';
    }
    if (response.status === 401) {
      return 'Your sign-in expired. Sign in again to continue.';
    }
    if (body.error?.message) return body.error.message;
  } catch {
    // fall through to the generic message below
  }
  return `YouTube API request failed (${response.status}).`;
}

async function fetchJson<T>(url: string, signal: AbortSignal, accessToken?: string): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: accessToken ? {Authorization: `Bearer ${accessToken}`} : undefined,
  });
  if (!response.ok) {
    throw new YouTubeApiError(await readErrorMessage(response));
  }
  return response.json() as Promise<T>;
}

function mapVideoItem(item: VideosListItem): VideoResult {
  return {
    id: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnailUrl:
      item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
    description: item.snippet.description,
    duration: formatDuration(item.contentDetails.duration),
    viewCount: formatViewCount(item.statistics.viewCount),
  };
}

async function fetchVideoDetails(
  ids: string[],
  apiKey: string,
  signal: AbortSignal,
): Promise<VideoResult[]> {
  if (ids.length === 0) return [];
  const url = `${API_BASE}/videos?part=snippet,contentDetails,statistics&id=${ids.join(',')}&key=${encodeURIComponent(apiKey)}`;
  const body = await fetchJson<{items: VideosListItem[]}>(url, signal);
  const byId = new Map(body.items.map(item => [item.id, item]));
  return ids
    .map(id => byId.get(id))
    .filter((item): item is VideosListItem => Boolean(item))
    .map(mapVideoItem);
}

export async function searchVideos(
  query: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<VideoResult[]> {
  const url = `${API_BASE}/search?part=snippet&type=video&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;
  const body = await fetchJson<{items: SearchListItem[]}>(url, signal);
  const ids = body.items.map(item => item.id.videoId).filter((id): id is string => Boolean(id));
  return fetchVideoDetails(ids, apiKey, signal);
}

export async function fetchTrending(apiKey: string, signal: AbortSignal): Promise<VideoResult[]> {
  const url = `${API_BASE}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&maxResults=20&key=${encodeURIComponent(apiKey)}`;
  const body = await fetchJson<{items: VideosListItem[]}>(url, signal);
  return body.items.map(mapVideoItem);
}

export async function fetchShorts(apiKey: string, signal: AbortSignal): Promise<VideoResult[]> {
  const url = `${API_BASE}/search?part=snippet&type=video&videoDuration=short&order=viewCount&q=%23shorts&maxResults=20&key=${encodeURIComponent(apiKey)}`;
  const body = await fetchJson<{items: SearchListItem[]}>(url, signal);
  const ids = body.items.map(item => item.id.videoId).filter((id): id is string => Boolean(id));
  return fetchVideoDetails(ids, apiKey, signal);
}

interface SubscriptionListItem {
  snippet: {
    title: string;
    resourceId: {channelId: string};
    thumbnails: {
      default?: {url: string};
      medium?: {url: string};
    };
  };
}

export async function fetchSubscriptions(
  accessToken: string,
  signal: AbortSignal,
): Promise<ChannelResult[]> {
  const url = `${API_BASE}/subscriptions?part=snippet&mine=true&maxResults=50&order=alphabetical`;
  const body = await fetchJson<{items: SubscriptionListItem[]}>(url, signal, accessToken);
  return body.items.map(item => ({
    id: item.snippet.resourceId.channelId,
    title: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? '',
  }));
}

export async function fetchChannelUploads(
  channelId: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<VideoResult[]> {
  const url = `${API_BASE}/search?part=snippet&type=video&channelId=${encodeURIComponent(channelId)}&order=date&maxResults=20&key=${encodeURIComponent(apiKey)}`;
  const body = await fetchJson<{items: SearchListItem[]}>(url, signal);
  const ids = body.items.map(item => item.id.videoId).filter((id): id is string => Boolean(id));
  return fetchVideoDetails(ids, apiKey, signal);
}

export function formatDuration(iso8601: string): string {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso8601);
  if (!match) return '';
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatViewCount(raw: string | undefined): string {
  const count = Number(raw ?? 0);
  if (!Number.isFinite(count)) return '';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K views`;
  return count === 1 ? '1 view' : `${count} views`;
}

export function formatRelativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  const years = Math.floor(months / 12);
  return `${years} yr ago`;
}
