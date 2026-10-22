const features = [
  {
    title: 'Organize everything',
    description: 'Group work into projects and lists so nothing slips through the cracks.',
  },
  {
    title: 'Track progress',
    description: 'See what is done, what is in progress, and what needs attention at a glance.',
  },
  {
    title: 'Work together',
    description: 'Share updates with your team and keep everyone on the same page.',
  },
];

export function HomeFeatures() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-24 sm:px-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Everything you need to stay on track
        </h2>
        <p className="mt-4 text-lg text-slate-600">Simple tools that get out of your way.</p>
      </div>
      <ul className="mt-16 grid gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <li key={feature.title} className="rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
            <p className="mt-2 text-slate-600">{feature.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
