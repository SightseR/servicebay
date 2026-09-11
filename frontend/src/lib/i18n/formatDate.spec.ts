import { describe, expect, it } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats in Italian month names when lang is it', () => {
    expect(formatDate('it', '2026-06-01T10:00:00Z')).toMatch(/giu/i);
  });
  it('formats in English month names when lang is en', () => {
    expect(formatDate('en', '2026-06-01T10:00:00Z')).toMatch(/Jun/);
  });
});
