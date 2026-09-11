import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  it('only reflects the final value after the delay, coalescing rapid changes', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: 'a' } });
    expect(result.current).toBe('a');
    rerender({ v: 'ab' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ v: 'abc' });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('a'); // still debouncing
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('abc');
    vi.useRealTimers();
  });
});
