import type {InstrumentDef, Ticker} from './marketData';

interface FinnhubQuote {
  c?: number; // current price
  pc?: number; // previous close
}

interface FinnhubTradeMessage {
  type: string;
  data?: Array<{s: string; p: number}>;
}

export class FinnhubError extends Error {}

export async function fetchInitialQuotes(
  apiKey: string,
  instruments: InstrumentDef[],
  signal: AbortSignal,
): Promise<Map<string, {price: number; previousClose: number}>> {
  const results = new Map<string, {price: number; previousClose: number}>();
  for (const instrument of instruments) {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(instrument.symbol)}&token=${encodeURIComponent(apiKey)}`,
      {signal},
    );
    if (response.status === 401 || response.status === 403) {
      throw new FinnhubError('That Finnhub API key was rejected.');
    }
    if (!response.ok) continue;
    const quote = (await response.json()) as FinnhubQuote;
    if (quote.c && quote.pc) {
      results.set(instrument.symbol, {price: quote.c, previousClose: quote.pc});
    }
  }
  return results;
}

export function connectFinnhubTrades(
  apiKey: string,
  instruments: InstrumentDef[],
  previousClose: Map<string, number>,
  onTick: (ticker: Ticker) => void,
  onStatusChange: (status: 'connecting' | 'open' | 'closed') => void,
): () => void {
  const socket = new WebSocket(`wss://ws.finnhub.io?token=${encodeURIComponent(apiKey)}`);

  onStatusChange('connecting');
  socket.onopen = () => {
    onStatusChange('open');
    for (const instrument of instruments) {
      socket.send(JSON.stringify({type: 'subscribe', symbol: instrument.symbol}));
    }
  };
  socket.onclose = () => onStatusChange('closed');
  socket.onerror = () => onStatusChange('closed');

  socket.onmessage = event => {
    try {
      const message = JSON.parse(event.data as string) as FinnhubTradeMessage;
      if (message.type !== 'trade' || !message.data) return;
      for (const trade of message.data) {
        const previousCloseValue = previousClose.get(trade.s);
        const changePercent = previousCloseValue
          ? ((trade.p - previousCloseValue) / previousCloseValue) * 100
          : 0;
        onTick({symbol: trade.s, price: trade.p, changePercent});
      }
    } catch {
      // Ignore malformed frames.
    }
  };

  return () => {
    for (const instrument of instruments) {
      try {
        socket.send(JSON.stringify({type: 'unsubscribe', symbol: instrument.symbol}));
      } catch {
        // Socket may already be closing.
      }
    }
    socket.close();
  };
}
