import { ValidationError } from '../../utils/errors';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUuid(value: unknown, field = 'id'): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ValidationError({ [field]: 'Must be a valid id' });
  }
  return value.toLowerCase();
}
