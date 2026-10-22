import { Button } from '@/components/ui';

export function HomeCallToAction() {
  return (
    <section id="get-started" className="scroll-mt-16 px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-6xl rounded-3xl bg-brand-600 px-6 py-16 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to get started?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">
          Create your workspace in minutes. No credit card required.
        </p>
        <Button href="#get-started" variant="inverse" className="mt-8">
          Create your workspace
        </Button>
      </div>
    </section>
  );
}
