import { useEffect, useState } from 'react';

/** Delays reflecting `value` by `delayMs`, so callers (e.g. search-as-you-type) don't fire on every keystroke. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
