import {useEffect, useRef, useState} from 'react';
import {buildingBankOutline, chartBarOutline, coinStackOutline, gemOutline} from '@wearables-ui-toolkit/icons';
import {App as WearablesApp, Page, SubNavigationPager, Toast, useBackNavigation} from '@wearables-ui-toolkit/mrbd';
import AlertSheet from './components/AlertSheet';
import MarketListScreen, {type MarketStatus} from './components/MarketListScreen';
import {readAlert} from './lib/alertStore';
import {playAlertSound} from './lib/alertSound';
import {FinnhubError, connectFinnhubTrades, fetchInitialQuotes} from './lib/finnhub';
import {readFinnhubKey, saveFinnhubKey} from './lib/finnhubKeyStore';
import {connectTickerStream, type InstrumentDef, type Ticker} from './lib/marketData';
import {pollYahooQuotes} from './lib/yahooFinance';

const CRYPTO_INSTRUMENTS: InstrumentDef[] = [
  {symbol: 'BTCUSDT', label: 'Bitcoin'},
  {symbol: 'ETHUSDT', label: 'Ethereum'},
  {symbol: 'BNBUSDT', label: 'BNB'},
  {symbol: 'SOLUSDT', label: 'Solana'},
];

const GOLD_INSTRUMENTS: InstrumentDef[] = [{symbol: 'PAXGUSDT', label: 'Gold (PAXG)'}];

const NASDAQ_INSTRUMENTS: InstrumentDef[] = [
  {symbol: 'AAPL', label: 'Apple'},
  {symbol: 'MSFT', label: 'Microsoft'},
  {symbol: 'GOOGL', label: 'Alphabet'},
  {symbol: 'AMZN', label: 'Amazon'},
  {symbol: 'TSLA', label: 'Tesla'},
  {symbol: 'NVDA', label: 'Nvidia'},
];

const BIST_INSTRUMENTS: InstrumentDef[] = [
  {symbol: 'THYAO.IS', label: 'Turkish Airlines'},
  {symbol: 'GARAN.IS', label: 'Garanti BBVA'},
  {symbol: 'AKBNK.IS', label: 'Akbank'},
  {symbol: 'ASELS.IS', label: 'Aselsan'},
  {symbol: 'BIMAS.IS', label: 'BIM'},
];

const BINANCE_INSTRUMENTS = [...CRYPTO_INSTRUMENTS, ...GOLD_INSTRUMENTS];
const YAHOO_POLL_INTERVAL_MS = 20_000;

const TABS = [
  {label: 'Crypto', icon: coinStackOutline},
  {label: 'Gold', icon: gemOutline},
  {label: 'NASDAQ', icon: chartBarOutline},
  {label: 'BIST', icon: buildingBankOutline},
];

function useAlertWatcher(tickers: Record<string, Ticker>) {
  const firedAlertsRef = useRef(new Set<string>());

  useEffect(() => {
    for (const ticker of Object.values(tickers)) {
      const alert = readAlert(ticker.symbol);
      if (!alert) {
        firedAlertsRef.current.delete(ticker.symbol);
        continue;
      }
      const crossed =
        alert.direction === 'above' ? ticker.price >= alert.threshold : ticker.price <= alert.threshold;
      if (crossed && !firedAlertsRef.current.has(ticker.symbol)) {
        firedAlertsRef.current.add(ticker.symbol);
        playAlertSound();
        Toast.show(`${ticker.symbol} alert`, `Price is ${alert.direction} $${alert.threshold.toLocaleString('en-US')}`);
      } else if (!crossed) {
        firedAlertsRef.current.delete(ticker.symbol);
      }
    }
  }, [tickers]);
}

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [selected, setSelected] = useState<InstrumentDef | null>(null);
  const [finnhubKey, setFinnhubKey] = useState<string | undefined>(() => readFinnhubKey());
  const [finnhubKeyDraft, setFinnhubKeyDraft] = useState('');
  const [nasdaqStatus, setNasdaqStatus] = useState<MarketStatus>(
    finnhubKey ? {kind: 'loading'} : {kind: 'missingKey'},
  );
  const [bistStatus, setBistStatus] = useState<MarketStatus>({kind: 'loading'});

  useAlertWatcher(tickers);

  function handleTick(ticker: Ticker) {
    setTickers(current => ({...current, [ticker.symbol]: ticker}));
  }

  useEffect(() => connectTickerStream(BINANCE_INSTRUMENTS, handleTick, () => {}), []);

  useEffect(() => {
    if (!finnhubKey) {
      setNasdaqStatus({kind: 'missingKey'});
      return;
    }
    setNasdaqStatus({kind: 'loading'});
    const controller = new AbortController();
    let disconnect: (() => void) | null = null;

    fetchInitialQuotes(finnhubKey, NASDAQ_INSTRUMENTS, controller.signal)
      .then(quotes => {
        if (controller.signal.aborted) return;
        const previousClose = new Map(Array.from(quotes, ([symbol, q]) => [symbol, q.previousClose]));
        for (const [symbol, quote] of quotes) {
          handleTick({symbol, price: quote.price, changePercent: ((quote.price - quote.previousClose) / quote.previousClose) * 100});
        }
        setNasdaqStatus({kind: 'ready'});
        disconnect = connectFinnhubTrades(finnhubKey, NASDAQ_INSTRUMENTS, previousClose, handleTick, () => {});
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setNasdaqStatus({
          kind: 'error',
          message: error instanceof FinnhubError ? error.message : "Couldn't reach Finnhub. Check your connection.",
        });
      });

    return () => {
      controller.abort();
      disconnect?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finnhubKey]);

  useEffect(() => {
    setBistStatus({kind: 'loading'});
    let receivedAny = false;
    return pollYahooQuotes(
      BIST_INSTRUMENTS,
      YAHOO_POLL_INTERVAL_MS,
      ticker => {
        receivedAny = true;
        handleTick(ticker);
        setBistStatus({kind: 'ready'});
      },
      message => {
        if (!receivedAny) setBistStatus({kind: 'error', message});
      },
    );
  }, []);

  function handleSaveFinnhubKey() {
    const trimmed = finnhubKeyDraft.trim();
    if (!trimmed) return;
    saveFinnhubKey(trimmed);
    setFinnhubKey(trimmed);
    setFinnhubKeyDraft('');
  }

  useBackNavigation(() => {
    if (selected) {
      setSelected(null);
      return;
    }
    if (activeTab !== 0) {
      setActiveTab(0);
      return;
    }
    return false;
  });

  return (
    <WearablesApp>
      <Page enableSystemBarInset={false} showHeader={false}>
        <div className="app-shell">
          <SubNavigationPager
            items={TABS}
            currentPageIndex={activeTab}
            onPageChange={index => setActiveTab(index)}
            useBackButtonForHome={false}
            ariaLabel="Main menu"
          >
            <MarketListScreen
              hidden={activeTab !== 0}
              ariaLabel="Crypto prices"
              instruments={CRYPTO_INSTRUMENTS}
              tickers={tickers}
              status={{kind: 'ready'}}
              onSelectSymbol={setSelected}
            />
            <MarketListScreen
              hidden={activeTab !== 1}
              ariaLabel="Gold price"
              instruments={GOLD_INSTRUMENTS}
              tickers={tickers}
              status={{kind: 'ready'}}
              onSelectSymbol={setSelected}
            />
            <MarketListScreen
              hidden={activeTab !== 2}
              ariaLabel="NASDAQ prices"
              instruments={NASDAQ_INSTRUMENTS}
              tickers={tickers}
              status={nasdaqStatus}
              keyDraft={finnhubKeyDraft}
              onKeyDraftChange={setFinnhubKeyDraft}
              onSaveKey={handleSaveFinnhubKey}
              onSelectSymbol={setSelected}
            />
            <MarketListScreen
              hidden={activeTab !== 3}
              ariaLabel="BIST prices, delayed"
              instruments={BIST_INSTRUMENTS}
              tickers={tickers}
              status={bistStatus}
              onSelectSymbol={setSelected}
            />
          </SubNavigationPager>

          {selected && (
            <AlertSheet
              label={selected.label}
              symbol={selected.symbol}
              currentPrice={tickers[selected.symbol]?.price}
              existing={readAlert(selected.symbol)}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </Page>
    </WearablesApp>
  );
}
