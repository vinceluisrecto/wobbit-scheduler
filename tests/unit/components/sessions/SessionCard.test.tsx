import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SessionCard } from '@/components/sessions';
import { makeSession } from '../fixtures';

describe('SessionCard', () => {
  it('links the whole card to the class and shows title, instructor and price', () => {
    render(<SessionCard session={makeSession()} />);

    const card = screen.getByRole('link');
    expect(card).toHaveAttribute('href', '/sessions/session-1');
    expect(card).toHaveTextContent('Sunset Vinyasa');
    expect(card).toHaveTextContent('with Ana Rivera · 75 min');
    expect(card).toHaveTextContent('$20.00');
    expect(card).toHaveTextContent('8 spots left');
    expect(card).toHaveTextContent('Book');
  });

  it('shows "Free" for free classes', () => {
    render(<SessionCard session={makeSession({ priceCents: 0 })} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('shows "Filling fast" when 3 or fewer spots are left', () => {
    render(<SessionCard session={makeSession({ spotsLeft: 1 })} />);
    expect(screen.getByText(/Filling fast · 1 spot left/)).toBeInTheDocument();
  });

  it('shows "Full" and "Join waitlist" for a full class', () => {
    render(<SessionCard session={makeSession({ spotsLeft: 0, isFull: true })} />);
    expect(screen.getByText('Full')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveTextContent('Join waitlist');
    expect(screen.queryByText(/Filling fast/)).not.toBeInTheDocument();
  });
});
