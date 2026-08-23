import { CookieError } from './errors';
import type { CookieAttributes, NormalizedAttributes, SameSite } from './types';

const SAME_SITE_VALUES: readonly SameSite[] = ['strict', 'lax', 'none'];
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

/** The two scope attributes delete() shares with set(). */
type Scope = Pick<CookieAttributes, 'path' | 'domain'>;

/**
 * Rejects a name no cookie can carry. Every public function calls this, so an
 * unusable name surfaces as a CookieError rather than an empty-named write
 * through document.cookie or a raw browser TypeError through the Cookie Store.
 */
export function validateName(name: string): void {
  if (typeof name !== 'string' || name === '') {
    throw new CookieError('INVALID_NAME', 'Cookie name must be a non-empty string.');
  }
  if (CONTROL_CHARACTERS.test(name)) {
    throw new CookieError('INVALID_NAME', 'Cookie name must not contain control characters.');
  }
}

/**
 * Rejects a path or domain that would inject an attribute. Neither passes
 * through encode(), unlike name and value, so a ';' inside either would close
 * its own field and open another one. Both routes to serialize(), set() and
 * delete(), call this.
 */
export function validateScope({ path, domain }: Scope): void {
  if (path !== undefined && (CONTROL_CHARACTERS.test(path) || path.includes(';'))) {
    throw new CookieError('INVALID_OPTIONS', 'path must not contain control characters or a semicolon.');
  }
  if (domain !== undefined && (CONTROL_CHARACTERS.test(domain) || domain.includes(';'))) {
    throw new CookieError('INVALID_OPTIONS', 'domain must not contain control characters or a semicolon.');
  }
}

/**
 * Validates a cookie name, value and attributes, and normalizes them for a
 * backend. Throws CookieError before anything reaches the browser when the
 * value is not a string or when attributes conflict, for example sameSite:
 * 'none' without secure: true, or the __Host- prefix combined with a domain.
 */
export function validate(
  name: string,
  value: string,
  attributes: CookieAttributes = {},
): NormalizedAttributes {
  validateName(name);
  if (typeof value !== 'string') {
    throw new CookieError('INVALID_VALUE', 'Cookie value must be a string.');
  }

  const { expires, maxAge, sameSite, secure, partitioned, path, domain } = attributes;

  validateScope(attributes);

  if (maxAge !== undefined && expires !== undefined) {
    throw new CookieError('INVALID_OPTIONS', 'Use either maxAge or expires, not both.');
  }
  if (maxAge !== undefined && !Number.isInteger(maxAge)) {
    throw new CookieError('INVALID_OPTIONS', 'maxAge must be a finite integer number of seconds.');
  }

  let normalizedExpires: number | undefined;
  if (expires !== undefined) {
    normalizedExpires = expires instanceof Date ? expires.getTime() : expires;
    if (!Number.isFinite(normalizedExpires)) {
      throw new CookieError('INVALID_OPTIONS', 'expires must be a Date or Unix time in milliseconds.');
    }
  }

  if (sameSite !== undefined && !SAME_SITE_VALUES.includes(sameSite)) {
    throw new CookieError('INVALID_OPTIONS', "sameSite must be 'strict', 'lax' or 'none'.");
  }
  if (sameSite === 'none' && secure !== true) {
    throw new CookieError('INVALID_OPTIONS', "sameSite 'none' requires secure: true.");
  }
  if (partitioned === true && secure !== true) {
    throw new CookieError('INVALID_OPTIONS', 'partitioned requires secure: true.');
  }
  if (name.startsWith('__Secure-') && secure !== true) {
    throw new CookieError('INVALID_OPTIONS', 'The __Secure- prefix requires secure: true.');
  }
  if (name.startsWith('__Host-')) {
    if (secure !== true) {
      throw new CookieError('INVALID_OPTIONS', 'The __Host- prefix requires secure: true.');
    }
    if (path !== '/') {
      throw new CookieError('INVALID_OPTIONS', "The __Host- prefix requires path '/'.");
    }
    if (domain !== undefined) {
      throw new CookieError('INVALID_OPTIONS', 'The __Host- prefix forbids a domain.');
    }
  }

  const normalized: NormalizedAttributes = {};
  if (path !== undefined) normalized.path = path;
  if (domain !== undefined) normalized.domain = domain;
  if (maxAge !== undefined) normalized.maxAge = maxAge;
  if (normalizedExpires !== undefined) normalized.expires = normalizedExpires;
  if (secure !== undefined) normalized.secure = secure;
  if (sameSite !== undefined) normalized.sameSite = sameSite;
  if (partitioned !== undefined) normalized.partitioned = partitioned;
  return normalized;
}
