import { describe, expect, it } from 'vitest';

import { formatDate, formatPercent, formatPrice } from './format';

describe('formatPercent', () => {
  it('formats a positive ratio with an explicit + sign', () => {
    expect(formatPercent('0.083047')).toBe('+%8,30');
  });

  it('formats a negative ratio with a - sign', () => {
    expect(formatPercent('-0.021500')).toBe('-%2,15');
  });

  it('returns the missing-value placeholder for null', () => {
    expect(formatPercent(null)).toBe('—');
  });
});

describe('formatPrice', () => {
  it('formats a price string using tr-TR grouping/decimal separators', () => {
    expect(formatPrice('32.150000')).toBe('32,15');
  });

  it('returns the missing-value placeholder for null', () => {
    expect(formatPrice(null)).toBe('—');
  });
});

describe('formatDate', () => {
  it('formats an ISO date as a Turkish medium date', () => {
    expect(formatDate('2026-08-10')).toContain('2026');
  });

  it('returns the missing-value placeholder for null', () => {
    expect(formatDate(null)).toBe('—');
  });
});
