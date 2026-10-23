import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { animate, onScroll, stagger, animationRevert, observerRevert, reducedMotion } = vi.hoisted(() => {
  const animationRevert = vi.fn();
  const observerRevert = vi.fn();
  return {
    animationRevert,
    observerRevert,
    animate: vi.fn(() => ({ revert: animationRevert })),
    onScroll: vi.fn(() => ({ revert: observerRevert })),
    stagger: vi.fn(() => 'stagger-fn'),
    reducedMotion: { value: false },
  };
});

vi.mock('animejs', () => ({ animate, onScroll, stagger }));
vi.mock('@/utils/prefers-reduced-motion', () => ({ prefersReducedMotion: () => reducedMotion.value }));

const { Reveal } = await import('@/components/ui/Reveal');

beforeEach(() => {
  vi.clearAllMocks();
  reducedMotion.value = false;
});

describe('Reveal', () => {
  it('renders its content visible (no start state in the markup)', () => {
    animate.mockImplementationOnce(() => ({ revert: animationRevert }));
    render(<Reveal>Hello studio</Reveal>);

    const content = screen.getByText('Hello studio');
    expect(content).toBeVisible();
    expect(content.getAttribute('style')).toBeNull();
  });

  it('animates on scroll when motion is allowed', () => {
    render(<Reveal>Section</Reveal>);

    expect(onScroll).toHaveBeenCalledOnce();
    expect(animate).toHaveBeenCalledWith(
      screen.getByText('Section'),
      expect.objectContaining({ opacity: [0, 1], translateY: [20, 0], autoplay: expect.anything() }),
    );
  });

  it('does not call anime.js at all under reduced motion', () => {
    reducedMotion.value = true;
    render(<Reveal>Section</Reveal>);
    render(
      <Reveal variant="stagger">
        <p>One</p>
      </Reveal>,
    );

    expect(animate).not.toHaveBeenCalled();
    expect(onScroll).not.toHaveBeenCalled();
    expect(screen.getByText('Section')).toBeVisible();
  });

  it('staggers list children within the 300ms budget', () => {
    render(
      <Reveal variant="stagger">
        {Array.from({ length: 10 }, (_, index) => (
          <p key={index}>Item {index}</p>
        ))}
      </Reveal>,
    );

    expect(animate).toHaveBeenCalledOnce();
    const [step] = stagger.mock.calls[0] as unknown as [number];
    const { duration } = (animate.mock.calls[0] as unknown as [unknown, { duration: number }])[1];
    expect(duration + step * 9).toBeLessThanOrEqual(300);
  });

  it('reverts its animations on unmount', () => {
    const { unmount } = render(<Reveal>Section</Reveal>);
    unmount();

    expect(animationRevert).toHaveBeenCalledOnce();
    expect(observerRevert).toHaveBeenCalledOnce();
  });
});
