'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { signup } from '@/api/auth';
import { isApiError } from '@/api/client';
import { Button, Input, Notice, TextLink } from '@/components/ui';
import { safeNextPath } from '@/utils/safe-next-path';
import {
  compactErrors,
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateName,
  validateNewPassword,
  type AuthFieldErrors,
} from '@/utils/validate-auth-fields';
import { AuthCard } from './AuthCard';

export interface SignupFormProps {
  /** Where to go after signing up (the `?next=` query). */
  next?: string;
}

export function SignupForm({ next }: SignupFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const nextPath = safeNextPath(next);
  const loginHref = next ? `/login?next=${encodeURIComponent(nextPath)}` : '/login';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = compactErrors({
      name: validateName(name),
      email: validateEmail(email),
      password: validateNewPassword(password),
    });
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    try {
      await signup({ name: name.trim(), email: email.trim(), password });
      router.push(nextPath);
      return;
    } catch (error) {
      if (isApiError(error, 'EMAIL_TAKEN')) {
        setFieldErrors({ email: 'That email already has an account' });
      } else if (isApiError(error, 'VALIDATION_ERROR') && error.details) {
        setFieldErrors(error.details);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
    setIsLoading(false);
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Book classes in one tap."
      footer={
        <>
          Already have an account? <TextLink href={loginHref}>Log in</TextLink>
        </>
      }
    >
      <form method="post" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && <Notice tone="danger">{formError}</Notice>}
        <Input
          label="Name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={fieldErrors.name}
          required
        />
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
          error={fieldErrors.email}
          required
        />
        {fieldErrors.email === 'That email already has an account' && (
          <p className="-mt-3 text-sm">
            <TextLink href={loginHref}>Log in instead</TextLink>
          </p>
        )}
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters`}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          required
        />
        <Button type="submit" size="lg" fullWidth isLoading={isLoading} loadingLabel="Creating account…">
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
