import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('merges class names and drops falsy values', () => {
    const isDisabled: boolean = false;
    expect(cn('a', isDisabled && 'b', undefined, 'c')).toBe('a c');
  });

  it('resolves conflicting Tailwind utility classes (last one wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
