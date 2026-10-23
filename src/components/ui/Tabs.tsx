'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  /** Optional count shown after the label. */
  count?: number;
}

export interface TabsProps<T extends string> {
  /** Accessible name of the tab list, e.g. "My bookings". */
  label: string;
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** The content of the selected tab. */
  children: ReactNode;
}

/** Controlled tabs (WAI-ARIA pattern): arrow keys, Home and End move between tabs. */
export function Tabs<T extends string>({ label, tabs, value, onChange, children }: TabsProps<T>) {
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.value === value),
  );

  function selectAt(index: number) {
    const next = (index + tabs.length) % tabs.length;
    onChange(tabs[next].value);
    tabRefs.current[next]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = {
      ArrowRight: selectedIndex + 1,
      ArrowLeft: selectedIndex - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    selectAt(moves[event.key]);
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={handleKeyDown}
        className="inline-flex gap-1 rounded-full bg-ink-100 p-1"
      >
        {tabs.map((tab, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={tab.value}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.value}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(tab.value)}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-(--duration-fast)',
                isSelected ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    isSelected ? 'bg-brand-50 text-brand-700' : 'bg-ink-200 text-ink-600',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${tabs[selectedIndex]?.value}`}
        className="mt-6"
      >
        {children}
      </div>
    </div>
  );
}
