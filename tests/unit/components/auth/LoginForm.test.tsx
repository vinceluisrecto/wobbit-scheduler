import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { deferred } from '../fixtures';

const { push, login } = vi.hoisted(() => ({ push: vi.fn(), login: vi.fn() }));
const router = { push, replace: vi.fn(), refresh: vi.fn() }; // stable, like Next's real router
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/api/auth', () => ({ login }));

const { LoginForm } = await import('@/components/auth');

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginForm', () => {
  it('validates the fields before calling the API', () => {
    render(<LoginForm />);
    fillAndSubmit('not-an-email', '');

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter a valid email address');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter your password');
    expect(login).not.toHaveBeenCalled();
  });

  it('shows loading, then goes to the ?next= page', async () => {
    const pending = deferred<unknown>();
    login.mockReturnValue(pending.promise);
    render(<LoginForm next="/sessions/abc" />);

    fillAndSubmit(' maya@example.com ', 'studio-demo-2026');

    expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled();
    expect(login).toHaveBeenCalledWith({ email: 'maya@example.com', password: 'studio-demo-2026' });
    expect(push).not.toHaveBeenCalled();

    await act(async () => pending.resolve({ id: 'u1' }));
    expect(push).toHaveBeenCalledWith('/sessions/abc');
  });

  it('goes to the timetable by default and ignores off-site next values', async () => {
    login.mockResolvedValue({ id: 'u1' });
    render(<LoginForm next="https://evil.example" />);

    fillAndSubmit('maya@example.com', 'secret');

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/sessions'));
  });

  it('says the email or password is incorrect', async () => {
    login.mockRejectedValue(new ApiError('INVALID_CREDENTIALS', 'Invalid', 401));
    render(<LoginForm />);

    fillAndSubmit('maya@example.com', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it('falls back to POST, so a submit before hydration never puts the password in the URL', () => {
    const { container } = render(<LoginForm />);
    expect(container.querySelector('form')).toHaveAttribute('method', 'post');
  });

  it('keeps ?next= on the sign-up link', () => {
    render(<LoginForm next="/account" />);
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup?next=%2Faccount');
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
  });
});
