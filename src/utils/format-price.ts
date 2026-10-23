import { STUDIO_CURRENCY } from '@/constants/studio';

const priceFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: STUDIO_CURRENCY });

/** Formats a price in cents as USD, e.g. 1500 → "$15.00". 0 → "Free". */
export function formatPrice(priceCents: number): string {
  if (priceCents === 0) return 'Free';
  return priceFormatter.format(priceCents / 100);
}
