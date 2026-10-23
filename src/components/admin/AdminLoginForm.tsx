'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { login, logout } from '@/api/auth';
import { isApiError } from '@/api/client';
import { Button, Input, Notice } from '@/components/ui';
import { STUDIO_NAME } from '@/constants/studio';
import type { AdminLoginReason } from './redirect-if-signed-out';
import { SCHEDULE_PATH } from './schedule-url';

export interface AdminLoginFormProps {
  /** Why the guard sent the owner here, if it did. */
  reason?: AdminLoginReason;
}

const NOT_ADMIN_MESSAGE = "This account isn't an admin.";

const reasonMessages: Record<AdminLoginReason, string> = {
  forbidden: `${NOT_ADMIN_MESSAGE} Log in with an admin account.`,
  expired: 'Your admin session ended. Log in again.',
};

export function AdminLoginForm({ reason }: AdminLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(reason ? reasonMessages[reason] : null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const user = await login({ email: email.trim(), password });
      if (user.role !== 'admin') {
        // A member logged in by mistake: don't leave them logged in on the admin side.
        await logout().catch(() => undefined);
        setError(NOT_ADMIN_MESSAGE);
        setIsLoading(false);
        return;
      }
      router.replace(SCHEDULE_PATH);
    } catch (loginError) {
      setError(
        isApiError(loginError, 'INVALID_CREDENTIALS')
          ? 'Email or password is incorrect.'
          : "We couldn't log you in. Check your connection and try again.",
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-start justify-center px-4 py-12 sm:items-center">
      <div className="w-full max-w-sm rounded-control border border-ink-200 bg-white p-6 shadow-card">
        <p className="text-sm font-semibold text-ink-500">{STUDIO_NAME} admin</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink-900">Log in</h1>

        <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" fullWidth isLoading={isLoading} loadingLabel="Logging in…">
            Log in
          </Button>
        </form>
      </div>
    </div>
  );
}
