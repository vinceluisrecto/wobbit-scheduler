import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { animate, revert, stagger, reducedMotion } = vi.hoisted(() => {
  const revert = vi.fn();
  return {
    revert,
    animate: vi.fn(() => ({ revert })),
    stagger: vi.fn(() => 'stagger-fn'),
    reducedMotion: { value: false },
  };
});
vi.mock('animejs', () => ({ animate, stagger }));
vi.mock('@/utils/prefers-reduced-motion', () => ({ prefersReducedMotion: () => reducedMotion.value }));

const { HomeHero } = await import('@/components/home');

beforeEach(() => {
  vi.clearAllMocks();
  reducedMotion.value = false;
});

describe('HomeHero', () => {
  it('renders the headline, one sentence and the "See classes" CTA', () => {
    render(<HomeHero />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Move. Breathe. Book in one tap.');
    expect(screen.getByRole('link', { name: 'See classes' })).toHaveAttribute('href', '/sessions');
  });

  it('plays the entrance (headline stagger and one CTA pulse) within 1.2s', () => {
    render(<HomeHero />);

    expect(animate).toHaveBeenCalledTimes(2);
    const calls = animate.mock.calls as unknown as Array<[unknown, { duration: number; delay?: unknown }]>;
    const words = calls[0][1];
    const pulse = calls[1][1] as { duration: number; delay: number };
    const lastWordEnd = (stagger.mock.calls[0] as unknown as [number])[0] * 5 + words.duration;
    expect(lastWordEnd).toBeLessThanOrEqual(1200);
    expect(pulse.delay + pulse.duration).toBeLessThanOrEqual(1200);
  });

  it('does not animate under reduced motion', () => {
    reducedMotion.value = true;
    render(<HomeHero />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('reverts its animations on unmount', () => {
    const { unmount } = render(<HomeHero />);
    unmount();
    expect(revert).toHaveBeenCalledTimes(2);
  });
});
