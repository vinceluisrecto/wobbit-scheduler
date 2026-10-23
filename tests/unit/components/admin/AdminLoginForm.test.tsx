import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { login, logout } from '@/api/auth';
import { ApiError } from '@/api/client';
import { AdminLoginForm } from '@/components/admin';
import { router } from './navigation-mock';

vi.mock('next/navigation', async () => (await import('./navigation-mock')).navigationModule);
vi.mock('@/api/auth', () => ({ login: vi.fn(), logout: vi.fn() }));

function fillAndSubmit(email = 'owner@example.com', password = 'admin-password-123') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('AdminLoginForm', () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
    vi.mocked(logout).mockReset();
    router.replace.mockReset();
  });

  it('logs an admin in and goes to the schedule', async () => {
    vi.mocked(login).mockResolvedValue({ id: 'a1', name: 'Owner', email: 'owner@example.com', role: 'admin' });
    render(<AdminLoginForm />);

    fillAndSubmit();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/sessions'));
    expect(login).toHaveBeenCalledWith({ email: 'owner@example.com', password: 'admin-password-123' });
    expect(logout).not.toHaveBeenCalled();
  });

  it('refuses a member account and logs it out', async () => {
    vi.mocked(login).mockResolvedValue({ id: 'm1', name: 'Maya', email: 'maya@example.com', role: 'member' });
    vi.mocked(logout).mockResolvedValue(undefined);
    render(<AdminLoginForm />);

    fillAndSubmit('maya@example.com');

    expect(await screen.findByRole('alert')).toHaveTextContent("This account isn't an admin");
    expect(logout).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows wrong credentials inline', async () => {
    vi.mocked(login).mockRejectedValue(new ApiError('INVALID_CREDENTIALS', 'Email or password is incorrect', 401));
    render(<AdminLoginForm />);

    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
  });

  it('explains why the guard sent a member here', () => {
    render(<AdminLoginForm reason="forbidden" />);

    expect(screen.getByRole('alert')).toHaveTextContent("This account isn't an admin");
  });
});
