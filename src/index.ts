import { selectBackend } from './backends/select';
import { decode, encode } from './codec';
import type { Cookie, CookieAttributes, DeleteOptions } from './types';
import { validate } from './validate';

export { CookieError } from './errors';
export type { CookieErrorCode } from './errors';
export type { Cookie, CookieAttributes, DeleteOptions, SameSite } from './types';

/** Reads a cookie value, or undefined when it is not set. */
export async function get(name: string): Promise<string | undefined> {
  const found = await selectBackend().get(encode(name));
  return found === undefined ? undefined : decode(found.value);
}

/** Lists every readable cookie. Attributes are populated only by the Cookie Store backend. */
export async function getAll(): Promise<Cookie[]> {
  const all = await selectBackend().getAll();
  return all.map((cookie) => ({ ...cookie, name: decode(cookie.name), value: decode(cookie.value) }));
}

/** Reports whether a cookie is set, matching the name exactly. */
export async function has(name: string): Promise<boolean> {
  return (await selectBackend().get(encode(name))) !== undefined;
}

/** Writes a cookie. Throws CookieError before touching the browser when options conflict. */
export async function set(
  name: string,
  value: string,
  options: CookieAttributes = {},
): Promise<void> {
  const attributes = validate(name, value, options);
  await selectBackend().set(encode(name), encode(value), attributes);
}

/** Removes a cookie. A path or domain that does not match the original is a silent no-op. */
async function del(name: string, options: DeleteOptions = {}): Promise<void> {
  await selectBackend().delete(encode(name), options);
}

export { del as delete };

export const cookies = { get, getAll, has, set, delete: del };
