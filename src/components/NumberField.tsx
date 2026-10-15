import { useEffect, useState } from 'react';
import { parseNumber } from './format';

interface Props {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  className?: string;
  id?: string;
  label: string;
  placeholder?: string;
  parse?: (text: string) => number | undefined;
  format?: (value: number) => string;
}

/** A text input for numbers that keeps what the user is typing while it is focused. */
export function NumberField({ value, onChange, className, id, label, placeholder, parse = parseNumber, format = String }: Props) {
  const shown = value === undefined ? '' : format(value);
  const [draft, setDraft] = useState(shown);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(shown);
  }, [shown, focused]);

  return (
    <input
      className={className}
      id={id}
      type="text"
      inputMode="decimal"
      aria-label={label}
      placeholder={placeholder}
      value={focused ? draft : shown}
      onFocus={(e) => {
        setFocused(true);
        setDraft(shown);
        e.currentTarget.select();
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(parse(e.target.value));
      }}
    />
  );
}
