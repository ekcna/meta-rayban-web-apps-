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

async function fetchOne(instrument: InstrumentDef, signal: AbortSignal): Promise<Ticker | null> {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(instrument.symbol)}`,
    {signal},
  );
  if (!response.ok) return null;
  const body = (await response.json()) as YahooChartResponse;
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

export async function fetchYahooQuotes(
  instruments: InstrumentDef[],
  signal: AbortSignal,
): Promise<Ticker[]> {
  const results = await Promise.all(
    instruments.map(instrument => fetchOne(instrument, signal).catch(() => null)),
  );
  return results.filter((ticker): ticker is Ticker => ticker !== null);
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
      const tickers = await fetchYahooQuotes(instruments, controller.signal);
      if (tickers.length === 0) {
        onError("Couldn't reach delayed market data for these symbols.");
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
