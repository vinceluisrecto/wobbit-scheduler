'use client';

import { animate, stagger } from 'animejs';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui';
import { prefersReducedMotion } from '@/utils/prefers-reduced-motion';

const HEADLINE = ['Move.', 'Breathe.', 'Book', 'in', 'one', 'tap.'];

/**
 * The one signature entrance (≤ 1.2s): headline words rise in with a short stagger, then the CTA
 * pulses once. The words render visible in the HTML; motion starts only after JS, and never
 * under reduced motion. The background blobs drift with CSS.
 */
export function HomeHero() {
  const rootRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const cta = ctaRef.current;
    if (!root || !cta || prefersReducedMotion()) return;

    const words = animate(root.querySelectorAll('[data-hero-word]'), {
      opacity: [0, 1],
      translateY: ['0.45em', '0em'],
      duration: 600,
      delay: stagger(70),
      ease: 'out(4)',
    });
    const pulse = animate(cta, {
      scale: [1, 1.05, 1],
      duration: 500,
      delay: 650,
      ease: 'inOut(2)',
    });

    return () => {
      words.revert();
      pulse.revert();
    };
  }, []);

  return (
    <section ref={rootRef} className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 size-[26rem] rounded-full bg-brand-200/70 blur-3xl motion-safe:animate-drift" />
        <div className="absolute top-10 -right-32 size-[30rem] rounded-full bg-accent-200/60 blur-3xl motion-safe:animate-drift-slow" />
        <div className="absolute -bottom-40 left-1/3 size-[22rem] rounded-full bg-warning-100/80 blur-3xl motion-safe:animate-drift" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-28 sm:pb-32">
        <h1 className="max-w-4xl font-display text-[clamp(3rem,11vw,6.5rem)] leading-[0.95] font-extrabold tracking-tight text-ink-900">
          {HEADLINE.map((word, index) => (
            <span key={index} data-hero-word className="inline-block will-change-transform">
              {word}
              {index < HEADLINE.length - 1 && ' '}
            </span>
          ))}
        </h1>
        <p className="mt-6 max-w-md text-lg text-ink-600 sm:text-xl">
          Small classes, big energy. See what&apos;s on and save your spot.
        </p>
        <div ref={ctaRef} className="mt-9 inline-block">
          <Button href="/sessions" size="lg" transitionTypes={['nav-forward']}>
            See classes
          </Button>
        </div>
      </div>
    </section>
  );
}
