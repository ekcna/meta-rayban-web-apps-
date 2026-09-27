import {useEffect, useRef, useState} from 'react';
import {coinStackOutline, gemOutline} from '@wearables-ui-toolkit/icons';
import {App as WearablesApp, Page, SubNavigationPager, Toast, useBackNavigation} from '@wearables-ui-toolkit/mrbd';
import AlertSheet from './components/AlertSheet';
import MarketListScreen from './components/MarketListScreen';
import {readAlert} from './lib/alertStore';
import {playAlertSound} from './lib/alertSound';
import {connectTickerStream, type InstrumentDef, type Ticker} from './lib/marketData';

const CRYPTO_INSTRUMENTS: InstrumentDef[] = [
  {symbol: 'BTCUSDT', label: 'Bitcoin'},
  {symbol: 'ETHUSDT', label: 'Ethereum'},
  {symbol: 'BNBUSDT', label: 'BNB'},
  {symbol: 'SOLUSDT', label: 'Solana'},
];

const GOLD_INSTRUMENTS: InstrumentDef[] = [{symbol: 'PAXGUSDT', label: 'Gold (PAXG)'}];

const ALL_INSTRUMENTS = [...CRYPTO_INSTRUMENTS, ...GOLD_INSTRUMENTS];

const TABS = [
  {label: 'Crypto', icon: coinStackOutline},
  {label: 'Gold', icon: gemOutline},
];

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [selected, setSelected] = useState<InstrumentDef | null>(null);
  const firedAlertsRef = useRef(new Set<string>());

  useEffect(() => {
    const disconnect = connectTickerStream(
      ALL_INSTRUMENTS,
      ticker => {
        setTickers(current => ({...current, [ticker.symbol]: ticker}));

        const alert = readAlert(ticker.symbol);
        if (!alert) {
          firedAlertsRef.current.delete(ticker.symbol);
          return;
        }
        const crossed =
          alert.direction === 'above' ? ticker.price >= alert.threshold : ticker.price <= alert.threshold;
        if (crossed && !firedAlertsRef.current.has(ticker.symbol)) {
          firedAlertsRef.current.add(ticker.symbol);
          playAlertSound();
          Toast.show(
            `${ticker.symbol} alert`,
            `Price is ${alert.direction} $${alert.threshold.toLocaleString('en-US')}`,
          );
        } else if (!crossed) {
          firedAlertsRef.current.delete(ticker.symbol);
        }
      },
      () => {},
    );
    return disconnect;
  }, []);

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
              onSelectSymbol={setSelected}
            />
            <MarketListScreen
              hidden={activeTab !== 1}
              ariaLabel="Gold price"
              instruments={GOLD_INSTRUMENTS}
              tickers={tickers}
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
