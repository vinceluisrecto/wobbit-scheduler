import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/utils/safe-next-path';

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/sessions/abc')).toBe('/sessions/abc');
    expect(safeNextPath('/account')).toBe('/account');
  });

  it('falls back for missing or off-site targets', () => {
    expect(safeNextPath(undefined)).toBe('/sessions');
    expect(safeNextPath('')).toBe('/sessions');
    expect(safeNextPath('https://evil.example')).toBe('/sessions');
    expect(safeNextPath('//evil.example')).toBe('/sessions');
    expect(safeNextPath('/\\evil.example')).toBe('/sessions');
  });
});
