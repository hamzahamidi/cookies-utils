import { describe, expect, it } from 'vitest';
import { serialize } from './serialize';

describe('serialize', () => {
  it('writes a bare name and value', () => {
    expect(serialize('a', 'b', {})).toBe('a=b');
  });

  it('writes SameSite with an equals sign and a capitalized value', () => {
    expect(serialize('a', 'b', { sameSite: 'strict' })).toBe('a=b; SameSite=Strict');
    expect(serialize('a', 'b', { sameSite: 'lax' })).toBe('a=b; SameSite=Lax');
    expect(serialize('a', 'b', { sameSite: 'none', secure: true }))
      .toBe('a=b; Secure; SameSite=None');
  });

  it('keeps Max-Age of zero', () => {
    expect(serialize('a', 'b', { maxAge: 0 })).toBe('a=b; Max-Age=0');
  });

  it('keeps a negative Max-Age', () => {
    expect(serialize('a', 'b', { maxAge: -1 })).toBe('a=b; Max-Age=-1');
  });

  it('formats expires as a UTC string', () => {
    expect(serialize('a', 'b', { expires: 0 })).toBe('a=b; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  });

  it('omits Secure and Partitioned when false', () => {
    expect(serialize('a', 'b', { secure: false, partitioned: false })).toBe('a=b');
  });

  it('emits every attribute in a fixed order', () => {
    const result = serialize('a', 'b', {
      maxAge: 60,
      path: '/app',
      domain: 'example.com',
      secure: true,
      sameSite: 'lax',
      partitioned: true,
    });
    expect(result).toBe(
      'a=b; Max-Age=60; Path=/app; Domain=example.com; Secure; SameSite=Lax; Partitioned',
    );
  });

  it('writes an empty value', () => {
    expect(serialize('a', '', { maxAge: 0 })).toBe('a=; Max-Age=0');
  });
});
