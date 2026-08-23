import { describe, expect, it } from 'vitest';
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

describe('Cookie Store backend', () => {
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
    const store = new FakeCookieStore();
    const backend = createCookieStoreBackend(store);
    await backend.set('a', '1', { maxAge: 60, path: '/', sameSite: 'lax', partitioned: true, secure: true });
    expect(store.setCalls).toEqual([
      { name: 'a', value: '1', maxAge: 60, path: '/', sameSite: 'lax', partitioned: true },
    ]);
  });

  it('forwards domain and expires, the two fields the maxAge case above leaves untried', async () => {
    const store = new FakeCookieStore();
    const backend = createCookieStoreBackend(store);
    await backend.set('a', '1', { domain: 'example.com', expires: 42 });
    expect(store.setCalls).toEqual([{ name: 'a', value: '1', domain: 'example.com', expires: 42 }]);
  });

  it('forwards maxAge zero, which a truthiness check would drop', async () => {
    const store = new FakeCookieStore();
    const backend = createCookieStoreBackend(store);
    await backend.set('a', '1', { maxAge: 0 });
    expect(store.setCalls).toEqual([{ name: 'a', value: '1', maxAge: 0 }]);
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
