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

  it('rejects malformed Unicode names and values as CookieErrors', () => {
    expect(codeOf(() => validate('\ud800', 'b'))).toBe('INVALID_NAME');
    expect(codeOf(() => validate('a', '\ud800'))).toBe('INVALID_VALUE');
  });

  it('rejects runtime option values with the wrong types', () => {
    const invalidOptions = [
      { path: 123 },
      { domain: {} },
      { expires: 'tomorrow' },
      { maxAge: NaN },
      { maxAge: Infinity },
      { secure: 'yes' },
      { sameSite: 1 },
      { partitioned: 1 },
    ];
    for (const options of invalidOptions) {
      expect(codeOf(() => validate('a', 'b', options as never))).toBe('INVALID_OPTIONS');
    }
  });

  it('rejects non-object options', () => {
    expect(codeOf(() => validate('a', 'b', null as never))).toBe('INVALID_OPTIONS');
    expect(codeOf(() => validate('a', 'b', [] as never))).toBe('INVALID_OPTIONS');
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

  it('requires a non-empty absolute path', () => {
    expect(codeOf(() => validate('a', 'b', { path: '' }))).toBe('INVALID_OPTIONS');
    expect(codeOf(() => validate('a', 'b', { path: 'account' }))).toBe('INVALID_OPTIONS');
    expect(validate('a', 'b', { path: '/account' })).toEqual({ path: '/account' });
  });

  it('rejects malformed explicit domains without duplicating browser origin checks', () => {
    for (const domain of ['', '.example.com', 'bad domain', 'example.com:443', 'example.com/path']) {
      expect(codeOf(() => validate('a', 'b', { domain }))).toBe('INVALID_OPTIONS');
    }
    expect(validate('a', 'b', { domain: 'example.com' })).toEqual({ domain: 'example.com' });
    expect(validate('a', 'b', { domain: 'münich.example' })).toEqual({ domain: 'münich.example' });
    expect(validate('a', 'b', { domain: '☕.example' })).toEqual({ domain: '☕.example' });
  });

  it('counts UTF-8 bytes for encoded name/value and scope limits', () => {
    expect(() => validate('n', 'é'.repeat(683))).toThrow(/Encoded cookie name and value exceed the 4096-byte limit/);
    expect(() => validate('a', 'b', { path: `/${'é'.repeat(512)}` })).toThrow(/UTF-8 path exceeds the 1024-byte limit/);
    const labels = Array.from({ length: 17 }, () => 'é'.repeat(30)).join('.');
    expect(() => validate('a', 'b', { domain: labels })).toThrow(/UTF-8 domain exceeds the 1024-byte limit/);
  });

  it('rejects JavaScript writes to HttpOnly cookie prefixes case-sensitively', () => {
    expect(codeOf(() => validate('__Http-session', 'x'))).toBe('UNSUPPORTED');
    expect(codeOf(() => validate('__Host-Http-session', 'x'))).toBe('UNSUPPORTED');
    expect(validate('__http-session', 'x')).toEqual({});
    expect(validate('__secure-session', 'x')).toEqual({});
    expect(validate('__host-session', 'x')).toEqual({});
  });

  it('accepts the maximum encoded cookie pair and maximum UTF-8 path sizes', () => {
    expect(validate('n', 'x'.repeat(4095))).toEqual({});
    expect(validate('a', 'b', { path: `/${'é'.repeat(511)}x` })).toEqual({
      path: `/${'é'.repeat(511)}x`,
    });
  });

  it('rejects expiry values outside the JavaScript date range', () => {
    expect(codeOf(() => validate('a', 'b', { expires: 8_640_000_000_001_000 }))).toBe('INVALID_OPTIONS');
    expect(codeOf(() => validate('a', 'b', { maxAge: 9_000_000_000_000 }))).toBe('INVALID_OPTIONS');
  });
});
