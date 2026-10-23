// pg returns timestamptz as a Date, but as a string inside row_to_json(); both become ISO-8601 UTC.
export function toIsoString(value: Date | string): string {
  return new Date(value).toISOString();
}

export function toIsoStringOrNull(value: Date | string | null): string | null {
  return value === null ? null : toIsoString(value);
}
