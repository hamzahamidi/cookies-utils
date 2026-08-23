import { parse } from '../parse';
import { serialize } from '../serialize';
import type { Backend, Cookie, DeleteOptions, NormalizedAttributes } from '../types';

/** The slice of Document this backend needs, injectable so tests can observe writes. */
export interface CookieTarget {
  cookie: string;
}

export function createDocumentCookieBackend(target: CookieTarget): Backend {
  const readAll = (): Cookie[] =>
    parse(target.cookie).map((pair) => ({ name: pair.name, value: pair.value }));

  return {
    async get(name: string): Promise<Cookie | undefined> {
      return readAll().find((cookie) => cookie.name === name);
    },

    async getAll(): Promise<Cookie[]> {
      return readAll();
    },

    async set(name: string, value: string, attributes: NormalizedAttributes): Promise<void> {
      target.cookie = serialize(name, value, attributes);
    },

    async delete(name: string, options: DeleteOptions): Promise<void> {
      target.cookie = serialize(name, '', { ...options, maxAge: 0, expires: 0 });
    },
  };
}
