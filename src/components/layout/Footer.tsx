import Link from 'next/link';
import { STUDIO_NAME } from '@/constants/studio';

export function Footer() {
  return (
    <footer className="border-t border-ink-200/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} {STUDIO_NAME}
        </p>
        <Link href="/sessions" className="inline-flex min-h-11 items-center font-medium text-ink-700 hover:text-ink-900">
          See this week&apos;s classes
        </Link>
      </div>
    </footer>
  );
}
