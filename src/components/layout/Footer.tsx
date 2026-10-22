export function Footer() {
  return (
    <footer className="border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500 sm:px-6">
        © {new Date().getFullYear()} Wobbit. All rights reserved.
      </div>
    </footer>
  );
}
