import { useState } from 'react';
import { parseTaskList } from '../engine/parse';

interface Props {
  onPaste: (text: string) => void;
  onSample?: () => void;
  compact?: boolean;
}

const PLACEHOLDER = ['- Booking page with available slots', '- Reminder emails the day before', '- Simple admin to block holidays', '- Payment of a deposit'].join('\n');

export function PasteBox({ onPaste, onSample, compact }: Props) {
  const [text, setText] = useState('');
  const count = parseTaskList(text).names.length;
  return (
    <div className="paste">
      {!compact && (
        <>
          <h3>Paste the client's feature list</h3>
          <p>One item per line. Bullets and numbers are fine; each line becomes a task.</p>
        </>
      )}
      <textarea aria-label="Feature list, one item per line" placeholder={PLACEHOLDER} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="paste-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={count === 0}
          onClick={() => {
            onPaste(text);
            setText('');
          }}
        >
          {count > 0 ? `Make ${count} task${count === 1 ? '' : 's'}` : 'Make tasks'}
        </button>
        {onSample && (
          <span className="panel-meta">
            or{' '}
            <button type="button" className="link-btn" onClick={onSample}>
              try the sample project
            </button>{' '}
            (a bakery's online ordering)
          </span>
        )}
      </div>
    </div>
  );
}
