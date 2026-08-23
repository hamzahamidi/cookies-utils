import { CookieError } from '../errors';
import type { Backend, Cookie, DeleteOptions, NormalizedAttributes, SameSite } from '../types';

/** Shape of a single result from CookieStore.get() or getAll(), before normalization. */
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

/** The slice of the Cookie Store API this backend needs, injectable so tests can observe writes without a real cookieStore global. */
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

/**
 * Builds a Backend backed by the Cookie Store API. Cookies it writes are
 * Secure by construction: CookieStore.set() has no secure option and only
 * runs in secure contexts, so secure: false is rejected as UNSUPPORTED rather
 * than being silently ignored.
 */
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
      // maxAge is not a CookieInit member and WebIDL drops unknown members in
      // silence, so forwarding it writes a session cookie on any engine that
      // has not implemented it. validate() guarantees maxAge and expires are
      // never both set. A non-positive maxAge becomes the epoch rather than
      // the arithmetic result, because Firefox keeps a cookie whose expires is
      // the current millisecond exactly.
      if (attributes.maxAge !== undefined) {
        options.expires = attributes.maxAge > 0 ? Date.now() + attributes.maxAge * 1000 : 0;
      } else if (attributes.expires !== undefined) {
        options.expires = attributes.expires;
      }
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
