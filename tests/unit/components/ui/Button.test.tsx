import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui';

describe('Button', () => {
  it('renders a link when given an href', () => {
    render(<Button href="/sessions">See classes</Button>);
    expect(screen.getByRole('link', { name: 'See classes' })).toHaveAttribute('href', '/sessions');
  });

  it('renders a button that handles clicks', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Book</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Book' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('shows the loading label and is disabled while loading', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} isLoading loadingLabel="Booking…">
        Book
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Booking…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps both labels in the DOM so the width does not change', () => {
    const { rerender } = render(<Button loadingLabel="Booking…">Book</Button>);
    expect(screen.getByText('Book')).toBeInTheDocument();
    expect(screen.getByText('Booking…')).toBeInTheDocument();

    rerender(
      <Button isLoading loadingLabel="Booking…">
        Book
      </Button>,
    );
    expect(screen.getByText('Book')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<Button disabled>Already started</Button>);
    expect(screen.getByRole('button', { name: 'Already started' })).toBeDisabled();
  });
});
