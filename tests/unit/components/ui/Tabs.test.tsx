import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Tabs } from '@/components/ui';

function Example() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  return (
    <Tabs
      label="My bookings"
      value={tab}
      onChange={setTab}
      tabs={[
        { value: 'upcoming', label: 'Upcoming', count: 2 },
        { value: 'past', label: 'Past' },
      ]}
    >
      <p>{tab === 'upcoming' ? 'Upcoming panel' : 'Past panel'}</p>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('shows the selected tab and switches on click', () => {
    render(<Example />);

    expect(screen.getByRole('tab', { name: /Upcoming/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Upcoming panel');

    fireEvent.click(screen.getByRole('tab', { name: 'Past' }));

    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Past panel');
  });

  it('moves with the arrow keys and labels the panel by its tab', () => {
    render(<Example />);

    fireEvent.keyDown(screen.getByRole('tab', { name: /Upcoming/ }), { key: 'ArrowRight' });

    const past = screen.getByRole('tab', { name: 'Past' });
    expect(past).toHaveAttribute('aria-selected', 'true');
    expect(past).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Past' })).toBeInTheDocument();
  });

  it('shows counts', () => {
    render(<Example />);
    expect(screen.getByRole('tab', { name: /Upcoming/ })).toHaveTextContent('Upcoming2');
  });
});
