import {triangleDownSmallFilled, triangleUpSmallFilled} from '@wearables-ui-toolkit/icons';
import {
  IconTintColor,
  InputTextView,
  ListItem,
  SubtitleTextColor,
  TextColor,
  TextStyle,
  TextView,
  VerticalList,
} from '@wearables-ui-toolkit/mrbd';
import type {InstrumentDef, Ticker} from '../lib/marketData';
import {formatPrice} from '../lib/marketData';

export type MarketStatus =
  | {kind: 'loading'}
  | {kind: 'ready'}
  | {kind: 'missingKey'}
  | {kind: 'error'; message: string};

export default function MarketListScreen({
  hidden,
  ariaLabel,
  instruments,
  tickers,
  status,
  keyDraft,
  onKeyDraftChange,
  onSaveKey,
  onSelectSymbol,
}: {
  hidden: boolean;
  ariaLabel: string;
  instruments: InstrumentDef[];
  tickers: Record<string, Ticker>;
  status: MarketStatus;
  keyDraft?: string;
  onKeyDraftChange?: (value: string) => void;
  onSaveKey?: () => void;
  onSelectSymbol: (instrument: InstrumentDef) => void;
}) {
  if (status.kind === 'missingKey') {
    return (
      <div className={`tab-page${hidden ? ' hidden' : ''}`}>
        <div className="content-inset status-message">
          <TextView as="p" textStyle={TextStyle.BODY2_EMPHASIZED}>
            Add a free Finnhub API key
          </TextView>
          <TextView as="p" textStyle={TextStyle.BODY2} textColor={TextColor.SECONDARY}>
            Sign up free at finnhub.io, then paste your API key below for live NASDAQ prices.
          </TextView>
          <InputTextView
            text={keyDraft ?? ''}
            onTextChange={onKeyDraftChange}
            hint="Finnhub API key"
            showActionButton
            actionLabel="Save"
            onSend={onSaveKey}
          />
        </div>
      </div>
    );
  }

  if (status.kind === 'error') {
    return (
      <div className={`tab-page${hidden ? ' hidden' : ''}`}>
        <div className="content-inset status-message">
          <TextView as="p" textStyle={TextStyle.BODY2}>
            {status.message}
          </TextView>
        </div>
      </div>
    );
  }

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
