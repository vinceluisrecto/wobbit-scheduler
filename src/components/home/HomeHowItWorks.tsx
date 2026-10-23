import type { ReactNode } from 'react';
import { Reveal } from '@/components/ui/Reveal';

interface Step {
  title: string;
  text: string;
  icon: ReactNode;
}

const iconProps = {
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'size-6',
} as const;

const steps: Step[] = [
  {
    title: 'Pick a class',
    text: 'Spots left, right on the card.',
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </svg>
    ),
  },
  {
    title: 'Tap Book',
    text: 'One tap and it’s yours.',
    icon: (
      <svg {...iconProps}>
        <path d="M9 11V5a2 2 0 1 1 4 0v5l4.3.9a2 2 0 0 1 1.6 2.2l-.6 4.4A3 3 0 0 1 15.3 20H11a3 3 0 0 1-2.4-1.2L5.4 14.6a1.6 1.6 0 0 1 2.4-2.1L9 13.7" />
      </svg>
    ),
  },
  {
    title: 'Show up',
    text: 'Pay at the studio. Enjoy.',
    icon: (
      <svg {...iconProps}>
        <path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        <path d="m8.5 12.5 2.5 2.5 4.5-5" />
      </svg>
    ),
  },
];

export function HomeHowItWorks() {
  return (
    <Reveal className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="font-display text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight text-ink-900">
          How it works
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-card border border-ink-200/70 bg-white p-6 shadow-card">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                {step.icon}
              </span>
              <p className="mt-5 text-sm font-semibold text-ink-500">Step {index + 1}</p>
              <h3 className="mt-1 font-display text-xl font-bold text-ink-900">{step.title}</h3>
              <p className="mt-1 text-ink-500">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </Reveal>
  );
}
