import { Button } from '@/components/ui';
import { Reveal } from '@/components/ui/Reveal';

export function HomeCallToAction() {
  return (
    <Reveal className="px-4 pt-4 pb-20 sm:px-6 sm:pb-28">
      <section className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-card bg-ink-900 px-6 py-16 text-center sm:py-20">
        <div
          aria-hidden="true"
          className="absolute -top-20 left-1/2 -z-10 size-80 -translate-x-1/2 rounded-full bg-brand-600/50 blur-3xl"
        />
        <h2 className="font-display text-[clamp(2rem,6vw,3.5rem)] font-bold tracking-tight text-white">
          Your spot is waiting.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-lg text-ink-200">Classes fill fast. Grab yours now.</p>
        <Button href="/sessions" variant="inverse" size="lg" className="mt-8" transitionTypes={['nav-forward']}>
          See classes
        </Button>
      </section>
    </Reveal>
  );
}
