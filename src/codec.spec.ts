import { describe, expect, it } from 'vitest';
import { decode, encode } from './codec';

describe('codec', () => {
  it('round trips characters that are illegal in a cookie', () => {
    for (const raw of ['a b', 'a;b', 'a=b', 'a,b', 'peche a l accent']) {
      expect(decode(encode(raw))).toBe(raw);
    }
  });

  it('encodes separators that would break the header', () => {
    expect(encode('a;b')).toBe('a%3Bb');
    expect(encode('a=b')).toBe('a%3Db');
  });

  it('returns the raw part when it is not valid percent encoding', () => {
    expect(decode('100%')).toBe('100%');
    expect(decode('%E0%A4%A')).toBe('%E0%A4%A');
  });
});
