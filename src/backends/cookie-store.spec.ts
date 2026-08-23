import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CookieError } from '../errors';
import {
  createCookieStoreBackend,
  type CookieStoreItem,
  type CookieStoreLike,
} from './cookie-store';

class FakeCookieStore implements CookieStoreLike {
  setCalls: Record<string, unknown>[] = [];
  deleteCalls: Record<string, unknown>[] = [];

  constructor(private items: CookieStoreItem[] = []) {}

  async get(name: string): Promise<CookieStoreItem | null> {
    return this.items.find((item) => item.name === name) ?? null;
  }

  async getAll(): Promise<CookieStoreItem[]> {
    return this.items;
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

/** A clock the maxAge to expires conversion can be asserted against exactly. */
const FIXED_NOW = Date.UTC(2099, 0, 2, 3, 4, 5);
const freezeClock = (): void => {
  vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
};

describe('Cookie Store backend', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes a missing cookie from null to undefined', async () => {
    const backend = createCookieStoreBackend(new FakeCookieStore());
    expect(await backend.get('a')).toBeUndefined();
  });

  it('maps the attributes the store reports', async () => {
    const store = new FakeCookieStore([
      { name: 'a', value: '1', path: '/', domain: 'example.com', expires: 42, secure: true, sameSite: 'lax', partitioned: false },
    ]);
    const backend = createCookieStoreBackend(store);
    expect(await backend.get('a')).toEqual({
      name: 'a',
      value: '1',
      path: '/',
      domain: 'example.com',
      expires: 42,
      secure: true,
      sameSite: 'lax',
      partitioned: false,
    });
  });

  it('tolerates a store that reports only name and value', async () => {
    const store = new FakeCookieStore([{ name: 'a', value: '1' }]);
    const backend = createCookieStoreBackend(store);
    expect(await backend.get('a')).toEqual({ name: 'a', value: '1' });
  });

  it('drops a null expires, which a session cookie reports', async () => {
    const store = new FakeCookieStore([{ name: 'a', value: '1', expires: null }]);
    const backend = createCookieStoreBackend(store);
    expect(await backend.get('a')).toEqual({ name: 'a', value: '1' });
  });

  it('lists every cookie the store returns, mapped the same way as get', async () => {
    const store = new FakeCookieStore([
      { name: 'a', value: '1', path: '/', secure: true },
      { name: 'b', value: '2' },
    ]);
    const backend = createCookieStoreBackend(store);
    expect(await backend.getAll()).toEqual([
      { name: 'a', value: '1', path: '/', secure: true },
      { name: 'b', value: '2' },
    ]);
  });

  it('forwards the options the Cookie Store API accepts', async () => {
    freezeClock();
    const store = new FakeCookieStore();
    const backend = createCookieStoreBackend(store);
    await backend.set('a', '1', { maxAge: 60, path: '/', sameSite: 'lax', partitioned: true, secure: true });
    expect(store.setCalls).toEqual([
      {
        name: 'a',
        value: '1',
        expires: FIXED_NOW + 60_000,
        path: '/',
        sameSite: 'lax',
        partitioned: true,
      },
    ]);
  });

  it('forwards domain and expires, the two fields the maxAge case above leaves untried', async () => {
    const store = new FakeCookieStore();
    const backend = createCookieStoreBackend(store);
    await backend.set('a', '1', { domain: 'example.com', expires: 42 });
    expect(store.setCalls).toEqual([{ name: 'a', value: '1', domain: 'example.com', expires: 42 }]);
  });

  it('converts maxAge to expires, the only one of the two CookieInit specifies', async () => {
    freezeClock();
    const store = new FakeCookieStore();
    const backend = createCookieStoreBackend(store);
    await backend.set('a', '1', { maxAge: 90 });
    expect(store.setCalls).toEqual([{ name: 'a', value: '1', expires: FIXED_NOW + 90_000 }]);
  });

  it('never sends maxAge, which WebIDL would drop in silence into a session cookie', async () => {
    freezeClock();
    const store = new FakeCookieStore();
    const backend = createCookieStoreBackend(store);
    await backend.set('a', '1', { maxAge: 90 });
    expect(Object.keys(store.setCalls[0])).not.toContain('maxAge');
  });

  it('converts maxAge zero to the epoch, which every engine reads as already expired', async () => {
    freezeClock();
    const store = new FakeCookieStore();
    const backend = createCookieStoreBackend(store);
    await backend.set('a', '1', { maxAge: 0 });
    expect(store.setCalls).toEqual([{ name: 'a', value: '1', expires: 0 }]);
  });

  it('converts a negative maxAge to the epoch too', async () => {
    freezeClock();
    const store = new FakeCookieStore();
    const backend = createCookieStoreBackend(store);
    await backend.set('a', '1', { maxAge: -60 });
    expect(store.setCalls).toEqual([{ name: 'a', value: '1', expires: 0 }]);
  });

  it('never forwards secure, which CookieStore.set does not accept', async () => {
    const store = new FakeCookieStore();
    const backend = createCookieStoreBackend(store);
    await backend.set('a', '1', { secure: true });
    expect(store.setCalls).toEqual([{ name: 'a', value: '1' }]);
  });

  it('rejects secure false, which this backend cannot express, without writing to the store', async () => {
    const store = new FakeCookieStore();
    const backend = createCookieStoreBackend(store);
    expect(await codeOfRejection(backend.set('a', '1', { secure: false }))).toBe('UNSUPPORTED');
    expect(store.setCalls).toEqual([]);
  });

  it('deletes with the given scope', async () => {
    const store = new FakeCookieStore();
    const backend = createCookieStoreBackend(store);
    await backend.delete('a', { path: '/app', domain: 'example.com' });
    expect(store.deleteCalls).toEqual([{ name: 'a', path: '/app', domain: 'example.com' }]);
  });

  it('omits scope fields that were not given, and forwards partitioned', async () => {
    const store = new FakeCookieStore();
    const backend = createCookieStoreBackend(store);
    await backend.delete('a', { partitioned: true });
    expect(store.deleteCalls).toEqual([{ name: 'a', partitioned: true }]);
  });
});
