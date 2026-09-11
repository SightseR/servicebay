import { describe, expect, it as test } from 'vitest';
import { resolveLabel } from './resolveLabel';

describe('resolveLabel', () => {
  test('returns Italian when active language is it and it is present', () => {
    expect(resolveLabel('it', 'Oil change', 'Cambio olio')).toBe('Cambio olio');
  });
  test('falls back to English when it is null/undefined/empty, even in IT mode', () => {
    expect(resolveLabel('it', 'Oil change', null)).toBe('Oil change');
    expect(resolveLabel('it', 'Oil change', undefined)).toBe('Oil change');
    expect(resolveLabel('it', 'Oil change', '')).toBe('Oil change');
  });
  test('always returns English when active language is en, regardless of it', () => {
    expect(resolveLabel('en', 'Oil change', 'Cambio olio')).toBe('Oil change');
  });
});
