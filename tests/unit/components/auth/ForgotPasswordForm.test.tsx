import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { forgotPassword } = vi.hoisted(() => ({ forgotPassword: vi.fn() }));
vi.mock('@/api/auth', () => ({ forgotPassword }));

const { FORGOT_PASSWORD_SENT_MESSAGE, ForgotPasswordForm } = await import('@/components/auth');

async function submit(email: string) {
  render(<ForgotPasswordForm />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
  return screen.findByRole('status');
}

beforeEach(() => {
  forgotPassword.mockReset().mockResolvedValue(undefined);
});

describe('ForgotPasswordForm', () => {
  it('shows the same message whether or not the email has an account', async () => {
    const known = await submit('maya@example.com');
    const knownText = known.textContent;
    document.body.innerHTML = '';

    const unknown = await submit('nobody@example.com');

    expect(knownText).toBe(FORGOT_PASSWORD_SENT_MESSAGE);
    expect(unknown.textContent).toBe(FORGOT_PASSWORD_SENT_MESSAGE);
    expect(forgotPassword).toHaveBeenNthCalledWith(1, { email: 'maya@example.com' });
    expect(forgotPassword).toHaveBeenNthCalledWith(2, { email: 'nobody@example.com' });
  });

  it('validates the email first', () => {
    render(<ForgotPasswordForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter your email');
    expect(forgotPassword).not.toHaveBeenCalled();
  });
});
