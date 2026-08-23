import { describe, expect, it } from 'vitest';
import type { CookieError } from './errors';
import { validate } from './validate';

const codeOf = (fn: () => unknown): string => {
  try {
    fn();
  } catch (error) {
    return (error as CookieError).code;
  }
  return 'DID_NOT_THROW';
};

describe('validate', () => {
  it('accepts a bare name and value', () => {
    expect(validate('a', 'b')).toEqual({});
  });

  it('keeps maxAge of zero', () => {
    expect(validate('a', 'b', { maxAge: 0 })).toEqual({ maxAge: 0 });
  });

  it('converts a Date expires to Unix milliseconds', () => {
    const when = new Date(Date.UTC(2099, 10, 1));
    expect(validate('a', 'b', { expires: when })).toEqual({ expires: when.getTime() });
  });

  it('rejects a non-finite expires', () => {
    expect(codeOf(() => validate('a', 'b', { expires: NaN }))).toBe('INVALID_OPTIONS');
  });

  it('accepts a plain numeric expires', () => {
    expect(validate('a', 'b', { expires: 1000 })).toEqual({ expires: 1000 });
  });

  it('rejects an empty name', () => {
    expect(codeOf(() => validate('', 'b'))).toBe('INVALID_NAME');
  });

  it('rejects a name containing a control character', () => {
    expect(codeOf(() => validate('a\u0001b', 'b'))).toBe('INVALID_NAME');
  });

  it('rejects a non string value', () => {
    expect(codeOf(() => validate('a', 1 as unknown as string))).toBe('INVALID_VALUE');
  });

  it('rejects maxAge and expires together', () => {
    expect(codeOf(() => validate('a', 'b', { maxAge: 1, expires: 2 }))).toBe('INVALID_OPTIONS');
  });

  it('rejects a non integer maxAge', () => {
    expect(codeOf(() => validate('a', 'b', { maxAge: 1.5 }))).toBe('INVALID_OPTIONS');
  });

  it('rejects an unknown sameSite', () => {
    expect(codeOf(() => validate('a', 'b', { sameSite: 'nope' as never }))).toBe('INVALID_OPTIONS');
  });

  it('rejects sameSite none without secure', () => {
    expect(codeOf(() => validate('a', 'b', { sameSite: 'none' }))).toBe('INVALID_OPTIONS');
  });

  it('rejects partitioned without secure', () => {
    expect(codeOf(() => validate('a', 'b', { partitioned: true }))).toBe('INVALID_OPTIONS');
  });

  it('rejects a __Secure- prefix without secure', () => {
    expect(codeOf(() => validate('__Secure-a', 'b'))).toBe('INVALID_OPTIONS');
  });

  it('rejects a __Host- prefix without secure', () => {
    expect(codeOf(() => validate('__Host-a', 'b'))).toBe('INVALID_OPTIONS');
  });

  it('rejects a __Host- prefix with a domain', () => {
    const attrs = { secure: true, path: '/', domain: 'example.com' };
    expect(codeOf(() => validate('__Host-a', 'b', attrs))).toBe('INVALID_OPTIONS');
  });

  it('rejects a __Host- prefix whose path is not /', () => {
    expect(codeOf(() => validate('__Host-a', 'b', { secure: true, path: '/app' }))).toBe('INVALID_OPTIONS');
  });

  it('accepts a correctly formed __Host- cookie', () => {
    expect(validate('__Host-a', 'b', { secure: true, path: '/' })).toEqual({ secure: true, path: '/' });
  });

  it('keeps domain, sameSite and partitioned in the normalized result', () => {
    const attrs = { domain: 'example.com', sameSite: 'lax' as const, partitioned: true, secure: true };
    expect(validate('a', 'b', attrs)).toEqual({
      domain: 'example.com',
      sameSite: 'lax',
      partitioned: true,
      secure: true,
    });
  });

  it('rejects a path containing a semicolon', () => {
    expect(codeOf(() => validate('a', 'b', { path: '/;Secure' }))).toBe('INVALID_OPTIONS');
  });

  it('rejects a domain containing a semicolon', () => {
    expect(codeOf(() => validate('a', 'b', { domain: 'example.com;evil' }))).toBe('INVALID_OPTIONS');
  });

  it('rejects a path containing a control character', () => {
    expect(codeOf(() => validate('a', 'b', { path: '/a\u0001b' }))).toBe('INVALID_OPTIONS');
  });
});
