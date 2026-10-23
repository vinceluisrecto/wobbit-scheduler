import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from '@/components/ui';

describe('Input', () => {
  it('is labeled', () => {
    render(<Input label="Email" type="email" autoComplete="email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('autocomplete', 'email');
  });

  it('links the hint and the error with aria-describedby', () => {
    render(<Input label="Password" hint="At least 8 characters" error="Use at least 8 characters" />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAccessibleDescription('At least 8 characters Use at least 8 characters');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('has no description or invalid state without a hint or error', () => {
    render(<Input label="Name" />);
    const input = screen.getByLabelText('Name');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
  });
});
