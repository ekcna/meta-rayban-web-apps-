import {triangleDownSmallFilled, triangleUpSmallFilled} from '@wearables-ui-toolkit/icons';
import {IconTintColor, ListItem, SubtitleTextColor, VerticalList} from '@wearables-ui-toolkit/mrbd';
import type {InstrumentDef, Ticker} from '../lib/marketData';
import {formatPrice} from '../lib/marketData';

export default function MarketListScreen({
  hidden,
  ariaLabel,
  instruments,
  tickers,
  onSelectSymbol,
}: {
  hidden: boolean;
  ariaLabel: string;
  instruments: InstrumentDef[];
  tickers: Record<string, Ticker>;
  onSelectSymbol: (instrument: InstrumentDef) => void;
}) {
  return (
    <div className={`tab-page${hidden ? ' hidden' : ''}`}>
      <VerticalList ariaLabel={ariaLabel} tabIndex={0} insetForHeader>
        {instruments.map(instrument => {
          const ticker = tickers[instrument.symbol];
          const rising = ticker ? ticker.changePercent >= 0 : undefined;
          const subtitle = ticker
            ? `$${formatPrice(ticker.price)} · ${ticker.changePercent >= 0 ? '+' : ''}${ticker.changePercent.toFixed(2)}%`
            : 'Connecting…';
          return (
            <ListItem
              key={instrument.symbol}
              title={instrument.label}
              subtitle={subtitle}
              subtitleMaxLines={1}
              subtitleTextColor={SubtitleTextColor.SECONDARY}
              icon={rising === undefined ? undefined : rising ? triangleUpSmallFilled : triangleDownSmallFilled}
              iconTintColor={rising === undefined ? undefined : rising ? IconTintColor.POSITIVE : IconTintColor.NEGATIVE}
              onClick={() => onSelectSymbol(instrument)}
            />
          );
        })}
      </VerticalList>
    </div>
  );
}
