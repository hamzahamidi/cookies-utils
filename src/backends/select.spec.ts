import { afterEach, describe, expect, it } from 'vitest';
import type { CookieError } from '../errors';
import { selectBackend } from './select';

const globalRef = globalThis as Record<string, unknown>;

const fakeStore = () => ({
  get: async () => null,
  getAll: async () => [],
  set: async () => {},
  delete: async () => {},
});

afterEach(() => {
  delete globalRef.cookieStore;
  delete globalRef.document;
  delete globalRef.location;
});

describe('selectBackend', () => {
  it('prefers the Cookie Store API when it exists', async () => {
    globalRef.cookieStore = fakeStore();
    expect(await selectBackend().getAll()).toEqual([]);
  });

  it('falls back to document.cookie', async () => {
    globalRef.document = { cookie: 'a=1' };
    expect(await selectBackend().getAll()).toEqual([{ name: 'a', value: '1' }]);
  });

  it('reports no cookie access when neither exists', () => {
    let code = 'DID_NOT_THROW';
    try {
      selectBackend();
    } catch (error) {
      code = (error as CookieError).code;
    }
    expect(code).toBe('NO_COOKIE_ACCESS');
  });

  it('ignores a document with no cookie property, which cannot carry a cookie', () => {
    globalRef.document = {};
    let code = 'DID_NOT_THROW';
    try {
      selectBackend();
    } catch (error) {
      code = (error as CookieError).code;
    }
    expect(code).toBe('NO_COOKIE_ACCESS');
  });

  it('prefers the Cookie Store over a document with no cookie property', async () => {
    globalRef.document = {};
    globalRef.cookieStore = fakeStore();
    expect(await selectBackend().getAll()).toEqual([]);
  });

  it('ignores a document with no cookie property on a plain http origin too', async () => {
    globalRef.location = { protocol: 'http:' };
    globalRef.document = {};
    globalRef.cookieStore = fakeStore();
    expect(await selectBackend().getAll()).toEqual([]);
  });

  it('uses document.cookie on a plain http origin even when cookieStore exists', async () => {
    globalRef.location = { protocol: 'http:' };
    globalRef.cookieStore = fakeStore();
    globalRef.document = { cookie: 'a=1' };
    expect(await selectBackend().getAll()).toEqual([{ name: 'a', value: '1' }]);
  });

  it('uses the Cookie Store API on an https origin', async () => {
    globalRef.location = { protocol: 'https:' };
    globalRef.cookieStore = fakeStore();
    globalRef.document = { cookie: 'a=1' };
    expect(await selectBackend().getAll()).toEqual([]);
  });

  it('uses the Cookie Store API on a plain http origin with no document, the service worker case', async () => {
    globalRef.location = { protocol: 'http:' };
    globalRef.cookieStore = fakeStore();
    expect(await selectBackend().getAll()).toEqual([]);
  });

  it('uses the Cookie Store API when location is absent', async () => {
    globalRef.cookieStore = fakeStore();
    globalRef.document = { cookie: 'a=1' };
    expect(await selectBackend().getAll()).toEqual([]);
  });

  it('treats an unreadable location as not http', async () => {
    Object.defineProperty(globalRef, 'location', {
      configurable: true,
      get() {
        throw new Error('location is not readable here');
      },
    });
    globalRef.cookieStore = fakeStore();
    globalRef.document = { cookie: 'a=1' };
    expect(await selectBackend().getAll()).toEqual([]);
  });
});
