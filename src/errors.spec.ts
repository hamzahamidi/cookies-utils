import { describe, expect, it } from 'vitest';
import { CookieError } from './errors';

describe('CookieError', () => {
  it('carries a machine readable code', () => {
    const error = new CookieError('INVALID_NAME', 'name must not be empty');
    expect(error.code).toBe('INVALID_NAME');
    expect(error.message).toBe('name must not be empty');
  });

  it('is named CookieError and is an Error', () => {
    const error = new CookieError('UNSUPPORTED', 'nope');
    expect(error.name).toBe('CookieError');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof CookieError).toBe(true);
  });
});
