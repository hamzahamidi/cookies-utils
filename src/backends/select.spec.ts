import { afterEach, describe, expect, it } from 'vitest';
import type { CookieError } from '../errors';
import { selectBackend } from './select';

const globalRef = globalThis as Record<string, unknown>;

afterEach(() => {
  delete globalRef.cookieStore;
  delete globalRef.document;
});

describe('selectBackend', () => {
  it('prefers the Cookie Store API when it exists', async () => {
    globalRef.cookieStore = { get: async () => null, getAll: async () => [], set: async () => {}, delete: async () => {} };
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
});
