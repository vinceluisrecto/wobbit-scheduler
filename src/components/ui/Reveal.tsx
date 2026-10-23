'use client';

import { animate, onScroll, stagger } from 'animejs';
import { useEffect, useRef, type ReactNode } from 'react';
import { prefersReducedMotion } from '@/utils/prefers-reduced-motion';

type RevealVariant = 'scroll' | 'stagger';

export interface RevealProps {
  children: ReactNode;
  /**
   * "scroll": the whole block fades and slides up 20px when it enters the viewport (landing sections).
   * "stagger": each direct child fades in on mount, with a short stagger capped at 300ms total (lists).
   */
  variant?: RevealVariant;
  className?: string;
}

const LIST_TOTAL_MS = 300;
const LIST_ITEM_MS = 220;

/**
 * Content is visible in the server HTML. Only after JavaScript runs, and only when motion is allowed,
 * does Reveal set the start state and animate. Every animation is reverted on unmount.
 */
export function Reveal({ children, variant = 'scroll', className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion()) return;

    if (variant === 'stagger') {
      const items = Array.from(element.children);
      if (items.length === 0) return;
      const step = items.length > 1 ? Math.min(40, (LIST_TOTAL_MS - LIST_ITEM_MS) / (items.length - 1)) : 0;
      const animation = animate(items, {
        opacity: [0, 1],
        translateY: [12, 0],
        duration: LIST_ITEM_MS,
        delay: stagger(step),
        ease: 'out(3)',
      });
      return () => {
        animation.revert();
      };
    }

    const observer = onScroll({ target: element, repeat: false });
    const animation = animate(element, {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 500,
      ease: 'out(3)',
      autoplay: observer,
    });
    return () => {
      animation.revert();
      observer.revert();
    };
    // Run once per mount: list items added later (e.g. after a refetch) simply appear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
