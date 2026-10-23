'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { createSession, updateSession } from '@/api/admin';
import { isApiError } from '@/api/client';
import { Button, Input, Notice } from '@/components/ui';
import type { AdminSessionSummary, SessionInput } from '@/types/admin';
import { redirectIfSignedOut } from './redirect-if-signed-out';

export interface SessionFormProps {
  /** The class to edit. Without it, the form creates a new class. */
  session?: AdminSessionSummary;
  onSaved: (session: AdminSessionSummary) => void;
  onCancel: () => void;
}

type FormField = 'title' | 'instructor' | 'startsAt' | 'duration' | 'capacity' | 'price';
type FormValues = Record<FormField, string>;
type FieldErrors = Partial<Record<FormField, string>>;

export const DEFAULT_DURATION_MINUTES = 60;
export const DEFAULT_CAPACITY = 12;
// "Capacity copied from the last class created" (§4.2), remembered on this device.
export const LAST_CAPACITY_STORAGE_KEY = 'studio-spot-admin:last-capacity';

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

// The API's field names → this form's fields, for VALIDATION_ERROR details.
const apiFieldToFormField: Record<keyof SessionInput, FormField> = {
  title: 'title',
  instructor: 'instructor',
  startsAt: 'startsAt',
  durationMinutes: 'duration',
  capacity: 'capacity',
  priceCents: 'price',
};

function readLastCapacity(): string {
  try {
    const stored = window.localStorage.getItem(LAST_CAPACITY_STORAGE_KEY);
    if (stored && /^\d+$/.test(stored)) return stored;
  } catch {
    // Storage can be blocked (private mode); the plain default is fine.
  }
  return String(DEFAULT_CAPACITY);
}

function rememberCapacity(capacity: number) {
  try {
    window.localStorage.setItem(LAST_CAPACITY_STORAGE_KEY, String(capacity));
  } catch {
    // Not critical: the next form just uses the default.
  }
}

/** ISO (UTC) → the `datetime-local` value in the device timezone (D6), e.g. "2026-10-24T18:30". */
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

function initialValues(session?: AdminSessionSummary): FormValues {
  if (!session) {
    return {
      title: '',
      instructor: '',
      startsAt: '',
      duration: String(DEFAULT_DURATION_MINUTES),
      capacity: readLastCapacity(),
      price: '',
    };
  }
  return {
    title: session.title,
    instructor: session.instructor,
    startsAt: toLocalInputValue(session.startsAt),
    duration: String(session.durationMinutes),
    capacity: String(session.capacity),
    price: (session.priceCents / 100).toFixed(2),
  };
}

function checkWholeNumber(value: string, min: number, max: number, label: string): string | undefined {
  const number = Number(value);
  if (!/^\d+$/.test(value.trim()) || number < min || number > max) return `${label} must be a whole number from ${min} to ${max}`;
  return undefined;
}

// Client-side mirrors of the session rules (§5), for instant feedback only. The server decides.
function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.title.trim()) errors.title = 'Enter a title';
  else if (values.title.trim().length > 100) errors.title = 'Use 100 characters or fewer';
  if (!values.instructor.trim()) errors.instructor = 'Enter an instructor';
  else if (values.instructor.trim().length > 100) errors.instructor = 'Use 100 characters or fewer';

  const start = new Date(values.startsAt);
  if (!values.startsAt || Number.isNaN(start.getTime())) errors.startsAt = 'Pick a date and time';
  else if (start.getTime() <= Date.now()) errors.startsAt = 'Pick a time in the future';

  errors.duration = checkWholeNumber(values.duration, 1, 600, 'Duration');
  errors.capacity = checkWholeNumber(values.capacity, 1, 500, 'Capacity');

  const price = values.price.trim();
  if (!PRICE_PATTERN.test(price) || Number(price) > 10_000) errors.price = 'Enter a price from 0 to 10,000, e.g. 15 or 12.50';

  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

/** Form values → the API body. Dollars become cents; the local time becomes ISO in UTC. */
function toSessionInput(values: FormValues): SessionInput {
  return {
    title: values.title.trim(),
    instructor: values.instructor.trim(),
    startsAt: new Date(values.startsAt).toISOString(),
    durationMinutes: Number(values.duration),
    capacity: Number(values.capacity),
    priceCents: Math.round(Number(values.price.trim()) * 100),
  };
}

/** Only what the admin changed, so an untouched start time is never re-sent (and members aren't emailed). */
function changedFields(values: FormValues, initial: FormValues): Partial<SessionInput> {
  const input = toSessionInput(values);
  const changes: Partial<SessionInput> = {};
  for (const [apiField, formField] of Object.entries(apiFieldToFormField) as [keyof SessionInput, FormField][]) {
    if (values[formField].trim() !== initial[formField].trim()) Object.assign(changes, { [apiField]: input[apiField] });
  }
  return changes;
}

/** The one form for creating and editing a class (the panel and the deep-link pages both use it). */
export function SessionForm({ session, onSaved, onCancel }: SessionFormProps) {
  const router = useRouter();
  const isEdit = session !== undefined;
  const [initial] = useState(() => initialValues(session));
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function setValue(field: FormField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function showApiError(error: unknown) {
    if (redirectIfSignedOut(error, router)) return;

    if (isApiError(error, 'CAPACITY_BELOW_BOOKINGS')) {
      const booked = session?.bookedCount ?? 0;
      setErrors({ capacity: `Capacity can't be lower than the ${booked} ${booked === 1 ? 'person' : 'people'} already booked` });
      return;
    }
    if (isApiError(error, 'SESSION_PAST')) {
      setFormError('This class has already started');
      return;
    }
    if (isApiError(error, 'VALIDATION_ERROR') && error.details) {
      const fieldErrors: FieldErrors = {};
      for (const [apiField, message] of Object.entries(error.details)) {
        const formField = apiFieldToFormField[apiField as keyof SessionInput];
        if (formField) fieldErrors[formField] = message;
      }
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length > 0) return;
    }
    setFormError(isApiError(error, 'SESSION_NOT_FOUND') ? 'This class no longer exists.' : "Couldn't save. Try again.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    let changes: Partial<SessionInput> = {};
    if (isEdit) {
      changes = changedFields(values, initial);
      if (Object.keys(changes).length === 0) {
        setFormError('Nothing changed yet.');
        return;
      }
    }

    setIsSaving(true);
    try {
      let saved: AdminSessionSummary;
      if (isEdit) {
        saved = await updateSession(session.id, changes);
      } else {
        saved = await createSession(toSessionInput(values));
        rememberCapacity(saved.capacity);
      }
      onSaved(saved);
    } catch (error) {
      showApiError(error);
      setIsSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Title"
        name="title"
        autoComplete="off"
        autoFocus
        maxLength={100}
        value={values.title}
        error={errors.title}
        onChange={(event) => setValue('title', event.target.value)}
      />
      <Input
        label="Instructor"
        name="instructor"
        autoComplete="off"
        maxLength={100}
        value={values.instructor}
        error={errors.instructor}
        onChange={(event) => setValue('instructor', event.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Starts"
          name="startsAt"
          type="datetime-local"
          hint="Your device's timezone"
          value={values.startsAt}
          error={errors.startsAt}
          onChange={(event) => setValue('startsAt', event.target.value)}
        />
        <Input
          label="Duration (minutes)"
          name="duration"
          type="number"
          inputMode="numeric"
          min={1}
          max={600}
          value={values.duration}
          error={errors.duration}
          onChange={(event) => setValue('duration', event.target.value)}
        />
        <Input
          label="Capacity"
          name="capacity"
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          value={values.capacity}
          error={errors.capacity}
          onChange={(event) => setValue('capacity', event.target.value)}
        />
        <Input
          label="Price (USD)"
          name="price"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0 for free"
          value={values.price}
          error={errors.price}
          onChange={(event) => setValue('price', event.target.value)}
        />
      </div>

      {formError && <Notice tone="danger">{formError}</Notice>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSaving} loadingLabel="Saving…">
          {isEdit ? 'Save changes' : 'Create class'}
        </Button>
      </div>
    </form>
  );
}
