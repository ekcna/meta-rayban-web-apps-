import type {InstrumentDef, Ticker} from './marketData';

interface YahooChartResponse {
  chart: {
    result?: Array<{
      meta: {
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
      };
    }>;
    error?: {description?: string} | null;
  };
}

function parseChartResponse(instrument: InstrumentDef, body: YahooChartResponse): Ticker | null {
  const meta = body.chart.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const previousClose = meta?.previousClose ?? meta?.chartPreviousClose;
  if (!price || !previousClose) return null;
  return {
    symbol: instrument.symbol,
    price,
    changePercent: ((price - previousClose) / previousClose) * 100,
  };
}

async function fetchViaUrl(url: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(url, {signal});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

async function fetchOne(
  instrument: InstrumentDef,
  signal: AbortSignal,
): Promise<{ticker: Ticker | null; lastError?: string}> {
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(instrument.symbol)}`;

  // Yahoo's unofficial endpoint doesn't reliably send CORS headers for arbitrary
  // browser origins, so a direct fetch can fail even though the data is public.
  // Try direct first (fastest, no third party), then fall back to a read-only
  // CORS proxy that just relays the same response.
  try {
    const response = await fetchViaUrl(targetUrl, signal);
    const body = (await response.json()) as YahooChartResponse;
    return {ticker: parseChartResponse(instrument, body)};
  } catch (directError) {
    try {
      const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetchViaUrl(proxied, signal);
      const body = (await response.json()) as YahooChartResponse;
      return {ticker: parseChartResponse(instrument, body)};
    } catch (proxyError) {
      const directMsg = directError instanceof Error ? directError.message : 'unknown';
      const proxyMsg = proxyError instanceof Error ? proxyError.message : 'unknown';
      return {ticker: null, lastError: `direct: ${directMsg} · proxy: ${proxyMsg}`};
    }
  }
}

export async function fetchYahooQuotes(
  instruments: InstrumentDef[],
  signal: AbortSignal,
): Promise<{tickers: Ticker[]; lastError?: string}> {
  const results = await Promise.all(instruments.map(instrument => fetchOne(instrument, signal)));
  const tickers = results
    .map(r => r.ticker)
    .filter((ticker): ticker is Ticker => ticker !== null);
  const lastError = results.find(r => r.lastError)?.lastError;
  return {tickers, lastError};
}

export function pollYahooQuotes(
  instruments: InstrumentDef[],
  intervalMs: number,
  onTick: (ticker: Ticker) => void,
  onError: (message: string) => void,
): () => void {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  async function poll() {
    try {
      const {tickers, lastError} = await fetchYahooQuotes(instruments, controller.signal);
      if (tickers.length === 0) {
        onError(lastError ? `Couldn't reach delayed market data (${lastError}).` : "Couldn't reach delayed market data.");
      } else {
        tickers.forEach(onTick);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      onError(error instanceof Error ? error.message : "Couldn't reach delayed market data.");
    }
    if (!stopped) timer = setTimeout(poll, intervalMs);
  }

  poll();

  return () => {
    stopped = true;
    controller.abort();
    if (timer) clearTimeout(timer);
  };
}
