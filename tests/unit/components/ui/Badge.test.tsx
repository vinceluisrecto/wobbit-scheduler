import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/ui';

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge tone="success">Paid</Badge>);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('uses the shared status colors', () => {
    const { rerender } = render(<Badge tone="success">Paid</Badge>);
    expect(screen.getByText('Paid')).toHaveClass('text-success-700');

    rerender(<Badge tone="warning">Unpaid</Badge>);
    expect(screen.getByText('Unpaid')).toHaveClass('text-warning-700');

    rerender(<Badge tone="danger">Cancelled</Badge>);
    expect(screen.getByText('Cancelled')).toHaveClass('text-danger-700');
  });

  it('can show a pulsing dot', () => {
    const { container } = render(
      <Badge tone="warning" dot="pulse">
        Filling fast
      </Badge>,
    );
    expect(container.querySelector('.animate-pulse-dot')).not.toBeNull();
  });
});
