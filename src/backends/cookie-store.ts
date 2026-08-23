import { CookieError } from '../errors';
import type { Backend, Cookie, DeleteOptions, NormalizedAttributes, SameSite } from '../types';

export interface CookieStoreItem {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: number | null;
  secure?: boolean;
  sameSite?: SameSite;
  partitioned?: boolean;
}

export interface CookieStoreLike {
  get(name: string): Promise<CookieStoreItem | null>;
  getAll(): Promise<CookieStoreItem[]>;
  set(options: Record<string, unknown>): Promise<void>;
  delete(options: Record<string, unknown>): Promise<void>;
}

function toCookie(item: CookieStoreItem): Cookie {
  const cookie: Cookie = { name: item.name, value: item.value };
  if (item.path !== undefined) cookie.path = item.path;
  if (item.domain !== undefined && item.domain !== null) cookie.domain = item.domain;
  if (item.expires !== undefined && item.expires !== null) cookie.expires = item.expires;
  if (item.secure !== undefined) cookie.secure = item.secure;
  if (item.sameSite !== undefined) cookie.sameSite = item.sameSite;
  if (item.partitioned !== undefined) cookie.partitioned = item.partitioned;
  return cookie;
}

export function createCookieStoreBackend(store: CookieStoreLike): Backend {
  return {
    async get(name: string): Promise<Cookie | undefined> {
      const item = await store.get(name);
      return item === null ? undefined : toCookie(item);
    },

    async getAll(): Promise<Cookie[]> {
      return (await store.getAll()).map(toCookie);
    },

    async set(name: string, value: string, attributes: NormalizedAttributes): Promise<void> {
      if (attributes.secure === false) {
        throw new CookieError(
          'UNSUPPORTED',
          'The Cookie Store API only runs in secure contexts and cannot write a non-Secure cookie.',
        );
      }

      // CookieStore.set accepts no secure option: cookies it writes are Secure by construction.
      const options: Record<string, unknown> = { name, value };
      if (attributes.path !== undefined) options.path = attributes.path;
      if (attributes.domain !== undefined) options.domain = attributes.domain;
      if (attributes.maxAge !== undefined) options.maxAge = attributes.maxAge;
      if (attributes.expires !== undefined) options.expires = attributes.expires;
      if (attributes.sameSite !== undefined) options.sameSite = attributes.sameSite;
      if (attributes.partitioned !== undefined) options.partitioned = attributes.partitioned;

      await store.set(options);
    },

    async delete(name: string, options: DeleteOptions): Promise<void> {
      const request: Record<string, unknown> = { name };
      if (options.path !== undefined) request.path = options.path;
      if (options.domain !== undefined) request.domain = options.domain;
      if (options.partitioned !== undefined) request.partitioned = options.partitioned;
      await store.delete(request);
    },
  };
}
