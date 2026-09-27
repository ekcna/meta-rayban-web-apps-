import {useState} from 'react';
import {bellRingOutline, chevronLeftOutline} from '@wearables-ui-toolkit/icons';
import {Button, ButtonRail, IconImage, InputTextView, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import {clearAlert, saveAlert, type AlertConfig} from '../lib/alertStore';
import {formatPrice} from '../lib/marketData';

export default function AlertSheet({
  label,
  symbol,
  currentPrice,
  existing,
  onClose,
}: {
  label: string;
  symbol: string;
  currentPrice: number | undefined;
  existing: AlertConfig | undefined;
  onClose: () => void;
}) {
  const [thresholdDraft, setThresholdDraft] = useState(existing ? String(existing.threshold) : '');

  function handleSet(direction: 'above' | 'below') {
    const threshold = Number(thresholdDraft.replace(/,/g, ''));
    if (!Number.isFinite(threshold) || threshold <= 0) return;
    saveAlert(symbol, {threshold, direction});
    onClose();
  }

  function handleClear() {
    clearAlert(symbol);
    onClose();
  }

  return (
    <div className="alert-sheet-overlay">
      <Button icon={chevronLeftOutline} onClick={onClose} ariaLabel="Close" />

      <div className="alert-sheet-card">
        <IconImage source={bellRingOutline} className="alert-sheet-icon" />
        <TextView as="p" textStyle={TextStyle.BODY2_EMPHASIZED}>
          {label}
        </TextView>
        <TextView as="p" textStyle={TextStyle.BODY2} textColor={TextColor.SECONDARY}>
          {currentPrice !== undefined ? `Current: $${formatPrice(currentPrice)}` : 'Waiting for price…'}
        </TextView>

        <InputTextView text={thresholdDraft} onTextChange={setThresholdDraft} hint="Alert price (USD)" />

        <ButtonRail>
          <Button title="Alert above" onClick={() => handleSet('above')} />
          <Button title="Alert below" onClick={() => handleSet('below')} />
          <Button title="Clear alert" onClick={handleClear} />
        </ButtonRail>
      </div>
    </div>
  );
}
