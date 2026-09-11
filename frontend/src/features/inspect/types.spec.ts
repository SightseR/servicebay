import { describe, expect, it } from 'vitest';
import { toWireValue } from './types';

describe('toWireValue', () => {
  it('CHECKLIST: all-empty omits, any flag or note keeps', () => {
    expect(toWireValue({ type: 'CHECKLIST', v: { done: false, urgent: false, later: false, note: '' } })).toBeUndefined();
    expect(toWireValue({ type: 'CHECKLIST', v: { done: true, urgent: false, later: false, note: '' } })).toEqual({ done: true, urgent: false, later: false });
    expect(toWireValue({ type: 'CHECKLIST', v: { done: false, urgent: false, later: false, note: '  fault  ' } })).toEqual({ done: false, urgent: false, later: false, note: 'fault' });
  });
  it('choice types: empty string/array omits', () => {
    expect(toWireValue({ type: 'DROPDOWN', v: '' })).toBeUndefined();
    expect(toWireValue({ type: 'DROPDOWN', v: 'opt1' })).toBe('opt1');
    expect(toWireValue({ type: 'MULTI_CHOICE', v: [] })).toBeUndefined();
    expect(toWireValue({ type: 'MULTI_CHOICE', v: ['a', 'b'] })).toEqual(['a', 'b']);
  });
  it('text: trims, blank omits', () => {
    expect(toWireValue({ type: 'TEXT', v: '   ' })).toBeUndefined();
    expect(toWireValue({ type: 'TEXT', v: ' hi ' })).toBe('hi');
  });
  it('number: passes the raw string through (server coerces), blank omits', () => {
    expect(toWireValue({ type: 'NUMBER', v: '' })).toBeUndefined();
    expect(toWireValue({ type: 'NUMBER', v: '80' })).toBe('80');
  });
});
