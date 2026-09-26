import {chevronLeftOutline} from '@wearables-ui-toolkit/icons';
import {IconImage, InputTextView} from '@wearables-ui-toolkit/mrbd';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

export default function OnScreenKeyboard({
  value,
  onChange,
  onSubmit,
  onClose,
}: {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  function pressKey(letter: string) {
    onChange(value + letter);
  }

  return (
    <div className="keyboard-overlay">
      <div className="keyboard-overlay-header">
        <button type="button" className="keyboard-back-btn" onClick={onClose} aria-label="Close keyboard">
          <IconImage source={chevronLeftOutline} className="keyboard-back-icon" />
        </button>
        <InputTextView text={value} onTextChange={onChange} hint="Search YouTube" />
      </div>

      <div className="keyboard-keys">
        {ROWS.map((row, rowIndex) => (
          <div className={`keyboard-key-row keyboard-key-row-${rowIndex}`} key={row}>
            {row.split('').map(letter => (
              <button
                key={letter}
                type="button"
                className="keyboard-key"
                onClick={() => pressKey(letter)}
              >
                {letter}
              </button>
            ))}
          </div>
        ))}
        <div className="keyboard-key-row keyboard-key-row-bottom">
          <button type="button" className="keyboard-key keyboard-key-wide" onClick={() => onChange('')}>
            clear
          </button>
          <button
            type="button"
            className="keyboard-key keyboard-key-space"
            onClick={() => onChange(`${value} `)}
          >
            space
          </button>
          <button
            type="button"
            className="keyboard-key keyboard-key-wide keyboard-key-accent"
            onClick={() => onChange(value.slice(0, -1))}
          >
            ⌫
          </button>
        </div>
        <div className="keyboard-key-row">
          <button type="button" className="keyboard-key keyboard-key-done" onClick={onSubmit}>
            ✓ Search
          </button>
        </div>
      </div>
    </div>
  );
}
