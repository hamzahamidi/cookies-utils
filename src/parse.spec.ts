import { describe, expect, it } from 'vitest';
import { parse } from './parse';

describe('parse', () => {
  it('returns nothing for an empty header', () => {
    expect(parse('')).toEqual([]);
  });

  it('reads a single pair', () => {
    expect(parse('a=b')).toEqual([{ name: 'a', value: 'b' }]);
  });

  it('reads several pairs and trims the separator spaces', () => {
    expect(parse('a=b; c=d;e=f')).toEqual([
      { name: 'a', value: 'b' },
      { name: 'c', value: 'd' },
      { name: 'e', value: 'f' },
    ]);
  });

  it('splits on the first equals only, because values may contain one', () => {
    expect(parse('a=b=c')).toEqual([{ name: 'a', value: 'b=c' }]);
  });

  it('treats a pair with no equals as a valueless cookie', () => {
    expect(parse('flag')).toEqual([{ name: 'flag', value: '' }]);
  });

  it('keeps both cookies when a name repeats', () => {
    expect(parse('a=1; a=2')).toEqual([
      { name: 'a', value: '1' },
      { name: 'a', value: '2' },
    ]);
  });

  it('ignores empty segments', () => {
    expect(parse('a=b;; ;c=d')).toEqual([
      { name: 'a', value: 'b' },
      { name: 'c', value: 'd' },
    ]);
  });
});
