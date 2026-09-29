import { selectBackend } from './backends/select';
import { decode, encode } from './codec';
import type { Cookie, CookieAttributes, DeleteOptions, SameSite } from './types';
import { validate, validateName, validateOptionsObject, validateScope, validateWritableName } from './validate';

export { CookieError } from './errors';
export type { CookieErrorCode } from './errors';
export type { Cookie, CookieAttributes, DeleteOptions, SameSite } from './types';

/**
 * Applied whenever the caller is silent, so both backends receive identical
 * input: left to the browser, document.cookie scopes to the current directory
 * and applies Lax while CookieStore.set() scopes to '/' and applies Strict.
 * Lax rather than Strict so upgrading from 1.0.0 cannot silently stop cookies
 * being sent on cross-site navigation.
 */
const DEFAULT_PATH = '/';
const DEFAULT_SAME_SITE: SameSite = 'lax';

/** Reads a cookie value, or undefined when it is not set. */
export async function get(name: string): Promise<string | undefined> {
  validateName(name);
  const found = await selectBackend().get(encode(name));
  return found === undefined ? undefined : decode(found.value);
}

/**
 * Lists every readable cookie. Attributes are populated only by the Cookie
 * Store backend. Several cookies can share a name; get(name) returns one
 * match, while getAll() preserves every matching cookie.
 */
export async function getAll(): Promise<Cookie[]> {
  const all = await selectBackend().getAll();
  return all.map((cookie) => ({ ...cookie, name: decode(cookie.name), value: decode(cookie.value) }));
}

/** Reports whether a cookie is set, matching the name exactly. */
export async function has(name: string): Promise<boolean> {
  validateName(name);
  return (await selectBackend().get(encode(name))) !== undefined;
}

/** Writes a cookie. Throws CookieError before touching the browser when options conflict. */
export async function set(
  name: string,
  value: string,
  options: CookieAttributes = {},
): Promise<void> {
  validateOptionsObject(options, 'set options');
  const provided = options as CookieAttributes;
  const attributes = validate(name, value, {
    ...provided,
    path: provided.path === undefined ? DEFAULT_PATH : provided.path,
    sameSite: provided.sameSite === undefined ? DEFAULT_SAME_SITE : provided.sameSite,
  });
  await selectBackend().set(encode(name), encode(value), attributes);
}

/**
 * Removes a cookie. A path or domain that does not match the original is a
 * silent no-op, so path defaults to the same '/' set() uses: without that the
 * two would target different cookies whenever the page is not at the root.
 */
async function del(name: string, options: DeleteOptions = {}): Promise<void> {
  validateName(name);
  validateWritableName(name);
  validateOptionsObject(options, 'delete options');
  const provided = options as DeleteOptions;
  const scoped: DeleteOptions = {
    ...provided,
    path: provided.path === undefined ? DEFAULT_PATH : provided.path,
  };
  validateScope(scoped);
  await selectBackend().delete(encode(name), scoped);
}

export { del as delete };

/** Namespace form of get, getAll, has, set and delete, for a single import. */
export const cookies = { get, getAll, has, set, delete: del };
