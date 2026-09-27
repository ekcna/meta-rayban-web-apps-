export interface Ticker {
  symbol: string;
  price: number;
  changePercent: number;
}

export interface InstrumentDef {
  symbol: string;
  label: string;
}

const STREAM_BASE = 'wss://stream.binance.com:9443/stream';

interface BinanceTickerPayload {
  stream: string;
  data: {
    s: string; // symbol
    c: string; // last price
    P: string; // price change percent
  };
}

export function connectTickerStream(
  instruments: InstrumentDef[],
  onTick: (ticker: Ticker) => void,
  onStatusChange: (status: 'connecting' | 'open' | 'closed') => void,
): () => void {
  const streams = instruments.map(i => `${i.symbol.toLowerCase()}@ticker`).join('/');
  const socket = new WebSocket(`${STREAM_BASE}?streams=${streams}`);

  onStatusChange('connecting');
  socket.onopen = () => onStatusChange('open');
  socket.onclose = () => onStatusChange('closed');
  socket.onerror = () => onStatusChange('closed');

  socket.onmessage = event => {
    try {
      const payload = JSON.parse(event.data as string) as BinanceTickerPayload;
      const price = Number(payload.data.c);
      const changePercent = Number(payload.data.P);
      if (Number.isFinite(price) && Number.isFinite(changePercent)) {
        onTick({symbol: payload.data.s, price, changePercent});
      }
    } catch {
      // Ignore malformed frames.
    }
  };

  return () => socket.close();
}

export function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', {maximumFractionDigits: 0});
  if (price >= 1) return price.toLocaleString('en-US', {maximumFractionDigits: 2});
  return price.toLocaleString('en-US', {maximumFractionDigits: 6});
}
