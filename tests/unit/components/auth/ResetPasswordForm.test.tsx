import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';

const { resetPassword } = vi.hoisted(() => ({ resetPassword: vi.fn() }));
vi.mock('@/api/auth', () => ({ resetPassword }));

const { ResetPasswordForm } = await import('@/components/auth');

function submit(password: string) {
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
}

beforeEach(() => {
  resetPassword.mockReset();
});

describe('ResetPasswordForm', () => {
  it('updates the password and asks to log in', async () => {
    resetPassword.mockResolvedValue(undefined);
    render(<ResetPasswordForm token="abc123" />);

    submit('a-new-password');

    expect(await screen.findByText('Password updated, please log in')).toBeInTheDocument();
    expect(resetPassword).toHaveBeenCalledWith({ token: 'abc123', password: 'a-new-password' });
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('explains an expired or used link, with a way to get a new one', async () => {
    resetPassword.mockRejectedValue(new ApiError('INVALID_RESET_TOKEN', 'Invalid', 400));
    render(<ResetPasswordForm token="used" />);

    submit('a-new-password');

    expect(await screen.findByText('This link has expired or was already used')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get a new link' })).toHaveAttribute('href', '/forgot-password');
  });

  it('treats a missing token as an invalid link', () => {
    render(<ResetPasswordForm />);
    expect(screen.getByText('This link has expired or was already used')).toBeInTheDocument();
  });

  it('checks the password length first', () => {
    render(<ResetPasswordForm token="abc123" />);
    submit('short');
    expect(screen.getByLabelText('New password')).toHaveAccessibleDescription(
      'At least 8 characters Use at least 8 characters',
    );
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
