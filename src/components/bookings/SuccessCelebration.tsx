'use client';

import { animate, createDrawable, stagger } from 'animejs';
import { useEffect, useRef, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/utils/prefers-reduced-motion';

export interface SuccessCelebrationProps {
  /** e.g. "You're booked!" or "You got a place!" */
  title: string;
  children: ReactNode;
  /** Play the check-mark draw and the card rise. Off: everything is simply shown. */
  play?: boolean;
}

/** The celebratory moment: a check mark draws in and the card below rises in. */
export function SuccessCelebration({ title, children, play = true }: SuccessCelebrationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const card = cardRef.current;
    if (!play || !svg || !card || prefersReducedMotion()) return;

    const strokes = animate(createDrawable(svg.querySelectorAll('[data-draw]')), {
      draw: ['0 0', '0 1'],
      duration: 450,
      delay: stagger(180),
      ease: 'out(3)',
    });
    const rise = animate(card, {
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 500,
      delay: 250,
      ease: 'out(4)',
    });

    return () => {
      strokes.revert();
      rise.revert();
    };
  }, [play]);

  return (
    <div className="flex flex-col items-center text-center">
      <svg ref={svgRef} aria-hidden="true" viewBox="0 0 52 52" className="size-16 text-success-500">
        <circle data-draw cx="26" cy="26" r="23" fill="none" stroke="currentColor" strokeWidth="3" />
        <path
          data-draw
          d="M15 27.5 22.5 35 37.5 19"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p role="status" className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-900">
        {title}
      </p>
      <div ref={cardRef} className="mt-6 w-full text-left">
        {children}
      </div>
    </div>
  );
}
