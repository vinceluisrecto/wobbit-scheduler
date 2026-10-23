import Link from 'next/link';
import { SessionList } from '@/components/sessions';
import { Reveal } from '@/components/ui/Reveal';

export function HomeThisWeek() {
  return (
    <Reveal className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <section aria-labelledby="this-week">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="this-week" className="font-display text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight text-ink-900">
            This week
          </h2>
          <Link
            href="/sessions"
            transitionTypes={['nav-forward']}
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-700 hover:text-brand-800"
          >
            All classes <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="mt-8">
          <SessionList limit={3} />
        </div>
      </section>
    </Reveal>
  );
}
