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

/** Records CookieStore.set() calls so the normalized attributes stay observable. */
class FakeCookieStore {
  setCalls: Record<string, unknown>[] = [];
  deleteCalls: Record<string, unknown>[] = [];
  async get(): Promise<null> {
    return null;
  }
  async getAll(): Promise<never[]> {
    return [];
  }
  async set(options: Record<string, unknown>): Promise<void> {
    this.setCalls.push(options);
  }
  async delete(options: Record<string, unknown>): Promise<void> {
    this.deleteCalls.push(options);
  }
}

const codeOfRejection = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
  } catch (error) {
    return (error as CookieError).code;
  }
  return 'DID_NOT_REJECT';
};

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
    expect(fake.writes).toEqual(['a=hello%20world; Path=/; SameSite=Lax']);
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

describe('defaults applied before either backend sees them', () => {
  it('gives a bare set a root path and SameSite Lax on document.cookie', async () => {
    const fake = new FakeDocument('');
    globalRef.document = fake;
    await cookies.set('a', 'b');
    expect(fake.writes).toEqual(['a=b; Path=/; SameSite=Lax']);
  });

  it('gives a bare set the same root path and lax on the Cookie Store', async () => {
    const store = new FakeCookieStore();
    globalRef.cookieStore = store;
    await cookies.set('a', 'b');
    expect(store.setCalls).toEqual([{ name: 'a', value: 'b', path: '/', sameSite: 'lax' }]);
  });

  it('leaves an explicit path and sameSite alone', async () => {
    const fake = new FakeDocument('');
    globalRef.document = fake;
    await cookies.set('a', 'b', { path: '/app', sameSite: 'strict' });
    expect(fake.writes).toEqual(['a=b; Path=/app; SameSite=Strict']);
  });

  it('accepts a __Host- cookie with no explicit path, since the default is the / it requires', async () => {
    const fake = new FakeDocument('');
    globalRef.document = fake;
    await cookies.set('__Host-a', 'b', { secure: true });
    expect(fake.writes).toEqual(['__Host-a=b; Path=/; Secure; SameSite=Lax']);
  });

  it('targets the root path on a bare delete, matching what a bare set writes', async () => {
    const fake = new FakeDocument('');
    globalRef.document = fake;
    await cookies.delete('a');
    expect(fake.writes).toEqual([
      'a=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/',
    ]);
  });

  it('leaves an explicit delete path alone', async () => {
    const fake = new FakeDocument('');
    globalRef.document = fake;
    await cookies.delete('a', { path: '/app' });
    expect(fake.writes).toEqual([
      'a=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/app',
    ]);
  });
});

describe('validation on every path, not just set', () => {
  it('rejects an empty name on get', async () => {
    globalRef.document = new FakeDocument('');
    expect(await codeOfRejection(cookies.get(''))).toBe('INVALID_NAME');
  });

  it('rejects an empty name on has', async () => {
    globalRef.document = new FakeDocument('');
    expect(await codeOfRejection(cookies.has(''))).toBe('INVALID_NAME');
  });

  it('rejects an empty name on delete without writing anything', async () => {
    const fake = new FakeDocument('');
    globalRef.document = fake;
    expect(await codeOfRejection(cookies.delete(''))).toBe('INVALID_NAME');
    expect(fake.writes).toEqual([]);
  });

  it('rejects a control character in the name on delete', async () => {
    globalRef.document = new FakeDocument('');
    expect(await codeOfRejection(cookies.delete('a\nb'))).toBe('INVALID_NAME');
  });

  it('rejects a delete path that would inject an attribute', async () => {
    const fake = new FakeDocument('');
    globalRef.document = fake;
    expect(await codeOfRejection(cookies.delete('a', { path: '/x; Domain=evil.example' }))).toBe(
      'INVALID_OPTIONS',
    );
    expect(fake.writes).toEqual([]);
  });

  it('rejects a delete domain that would inject an attribute', async () => {
    const fake = new FakeDocument('');
    globalRef.document = fake;
    expect(await codeOfRejection(cookies.delete('a', { domain: 'x; Secure' }))).toBe(
      'INVALID_OPTIONS',
    );
    expect(fake.writes).toEqual([]);
  });

  it('rejects a bad name before it reaches the Cookie Store, which throws a raw TypeError', async () => {
    const store = new FakeCookieStore();
    globalRef.cookieStore = store;
    expect(await codeOfRejection(cookies.delete(''))).toBe('INVALID_NAME');
    expect(store.deleteCalls).toEqual([]);
  });
});
