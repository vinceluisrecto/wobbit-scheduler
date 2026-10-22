import { Button } from '@/components/ui';

export function HomeHero() {
  return (
    <section className="bg-gradient-to-b from-brand-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
          Welcome to Wobbit
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          Plan, track, and ship your work in one place
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Keep your team aligned with a simple workspace for tasks, progress, and the details that
          matter.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Button href="#get-started">Get started</Button>
          <Button href="#features" variant="secondary">
            See features
          </Button>
        </div>
      </div>
    </section>
  );
}
