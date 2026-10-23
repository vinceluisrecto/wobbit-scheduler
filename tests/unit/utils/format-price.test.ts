import { describe, expect, it } from 'vitest';
import { formatPrice } from '@/utils/format-price';

describe('formatPrice', () => {
  it('formats cents as USD', () => {
    expect(formatPrice(1500)).toBe('$15.00');
    expect(formatPrice(1999)).toBe('$19.99');
    expect(formatPrice(123456)).toBe('$1,234.56');
  });

  it('shows free classes as "Free"', () => {
    expect(formatPrice(0)).toBe('Free');
  });
});
