import { afterEach, describe, expect, it } from 'vitest';
import { cookies, CookieError } from './index';

const globalRef = globalThis as Record<string, unknown>;

class FakeDocument {
  writes: string[] = [];
  constructor(public header = '') {}
  get cookie(): string {
    return this.header;
  }
  set cookie(written: string) {
    this.writes.push(written);
  }
}

afterEach(() => {
  delete globalRef.document;
  delete globalRef.cookieStore;
});

describe('public API', () => {
  it('decodes the value it reads', async () => {
    globalRef.document = new FakeDocument('greeting=hello%20world');
    expect(await cookies.get('greeting')).toBe('hello world');
  });

  it('round trips a name that needs encoding', async () => {
    const fake = new FakeDocument('a%20b=1');
    globalRef.document = fake;
    expect(await cookies.get('a b')).toBe('1');
    await cookies.delete('a b');
    expect(fake.writes[0].startsWith('a%20b=;')).toBe(true);
  });

  it('reports absence as undefined', async () => {
    globalRef.document = new FakeDocument('');
    expect(await cookies.get('nope')).toBeUndefined();
  });

  it('answers has without prefix matching', async () => {
    globalRef.document = new FakeDocument('session=1');
    expect(await cookies.has('session')).toBe(true);
    expect(await cookies.has('ses')).toBe(false);
  });

  it('encodes the value it writes', async () => {
    const fake = new FakeDocument('');
    globalRef.document = fake;
    await cookies.set('a', 'hello world');
    expect(fake.writes).toEqual(['a=hello%20world']);
  });

  it('rejects invalid options through the same channel', async () => {
    globalRef.document = new FakeDocument('');
    await expect(cookies.set('a', 'b', { sameSite: 'none' })).rejects.toBeInstanceOf(CookieError);
  });

  it('rejects with NO_COOKIE_ACCESS when there is no cookie jar', async () => {
    await expect(cookies.get('a')).rejects.toMatchObject({ code: 'NO_COOKIE_ACCESS' });
  });

  it('lists all cookies decoded', async () => {
    globalRef.document = new FakeDocument('a=1; b%20c=hello%20world');
    expect(await cookies.getAll()).toEqual([
      { name: 'a', value: '1' },
      { name: 'b c', value: 'hello world' },
    ]);
  });
});
