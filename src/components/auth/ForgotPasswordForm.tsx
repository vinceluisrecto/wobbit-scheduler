'use client';

import { useState, type FormEvent } from 'react';
import { forgotPassword } from '@/api/auth';
import { Button, Input, Notice, TextLink } from '@/components/ui';
import { validateEmail } from '@/utils/validate-auth-fields';
import { AuthCard } from './AuthCard';

// The same message for every email, so the page never reveals whether an account exists.
export const FORGOT_PASSWORD_SENT_MESSAGE = "If that email has an account, we've sent a reset link";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateEmail(email);
    setEmailError(error);
    setFormError(null);
    if (error) return;

    setIsLoading(true);
    try {
      await forgotPassword({ email: email.trim() });
      setIsSent(true);
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="We'll email you a link to set a new one."
      footer={<TextLink href="/login">Back to log in</TextLink>}
    >
      {isSent ? (
        <Notice tone="success">{FORGOT_PASSWORD_SENT_MESSAGE}</Notice>
      ) : (
        <form method="post" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && <Notice tone="danger">{formError}</Notice>}
          <Input
            label="Email"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={emailError}
            required
          />
          <Button type="submit" size="lg" fullWidth isLoading={isLoading} loadingLabel="Sending…">
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
