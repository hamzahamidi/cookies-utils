import { CookieError } from './errors';
import { encode } from './codec';
import type { CookieAttributes, NormalizedAttributes, SameSite } from './types';

const SAME_SITE_VALUES: readonly SameSite[] = ['strict', 'lax', 'none'];
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;
const MAX_COOKIE_PAIR_BYTES = 4096;
const MAX_SCOPE_BYTES = 1024;
const MAX_DATE_TIME = 8_640_000_000_000_000;

/** The two scope attributes delete() shares with set(). */
type Scope = Pick<CookieAttributes, 'path' | 'domain'>;

/** Checks the UTF-8 length of the exact string passed to a backend. */
function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

/** Uses the browser host parser so internationalized domains follow platform syntax. */
function hasPlausibleDomainSyntax(domain: string): boolean {
  if (/[\\/?#@]/.test(domain)) return false;
  if (domain.includes(':') && !(domain.startsWith('[') && domain.endsWith(']'))) return false;

  try {
    const parsed = new URL(`http://${domain}/`);
    return (
      parsed.hostname !== '' &&
      parsed.username === '' &&
      parsed.password === '' &&
      parsed.port === '' &&
      parsed.pathname === '/' &&
      parsed.search === '' &&
      parsed.hash === ''
    );
  } catch {
    return false;
  }
}

/** Rejects values that cannot act as an options dictionary. */
export function validateOptionsObject(options: unknown, label: string): void {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new CookieError('INVALID_OPTIONS', `${label} must be an object.`);
  }
}

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

  let encodedName: string;
  try {
    encodedName = encode(name);
  } catch {
    throw new CookieError('INVALID_NAME', 'Cookie name must contain valid Unicode.');
  }
  if (utf8ByteLength(encodedName) > MAX_COOKIE_PAIR_BYTES) {
    throw new CookieError('INVALID_NAME', 'Encoded cookie name exceeds the 4096-byte limit.');
  }
}

/** JavaScript cannot create, modify or delete cookies that require HttpOnly. */
export function validateWritableName(name: string): void {
  if (name.startsWith('__Http-') || name.startsWith('__Host-Http-')) {
    throw new CookieError(
      'UNSUPPORTED',
      'This cookie prefix requires an HttpOnly cookie created through Set-Cookie.',
    );
  }
}

/**
 * Rejects scope values that would inject an attribute or cannot be normalized
 * across Cookie Store and document.cookie.
 */
export function validateScope(scope: Scope | unknown): asserts scope is Scope {
  validateOptionsObject(scope, 'Cookie options');
  const { path, domain, partitioned } = scope as Record<string, unknown>;

  if (partitioned !== undefined && typeof partitioned !== 'boolean') {
    throw new CookieError('INVALID_OPTIONS', 'partitioned must be a boolean.');
  }

  if (path !== undefined) {
    if (typeof path !== 'string') {
      throw new CookieError('INVALID_OPTIONS', 'path must be a string.');
    }
    if (path === '') {
      throw new CookieError('INVALID_OPTIONS', 'path must not be empty.');
    }
    if (!path.startsWith('/')) {
      throw new CookieError('INVALID_OPTIONS', "path must start with '/'.");
    }
    if (CONTROL_CHARACTERS.test(path) || path.includes(';')) {
      throw new CookieError('INVALID_OPTIONS', 'path must not contain control characters or a semicolon.');
    }
    if (utf8ByteLength(path) > MAX_SCOPE_BYTES) {
      throw new CookieError('INVALID_OPTIONS', 'UTF-8 path exceeds the 1024-byte limit.');
    }
  }

  if (domain !== undefined) {
    if (typeof domain !== 'string') {
      throw new CookieError('INVALID_OPTIONS', 'domain must be a string.');
    }
    if (domain === '') {
      throw new CookieError('INVALID_OPTIONS', 'domain must not be empty.');
    }
    if (domain.startsWith('.')) {
      throw new CookieError('INVALID_OPTIONS', 'domain must not start with a dot.');
    }
    if (CONTROL_CHARACTERS.test(domain) || domain.includes(';')) {
      throw new CookieError('INVALID_OPTIONS', 'domain must not contain control characters or a semicolon.');
    }
    if (utf8ByteLength(domain) > MAX_SCOPE_BYTES) {
      throw new CookieError('INVALID_OPTIONS', 'UTF-8 domain exceeds the 1024-byte limit.');
    }
    if (!hasPlausibleDomainSyntax(domain)) {
      throw new CookieError('INVALID_OPTIONS', 'domain must be a syntactically valid host.');
    }
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
  validateWritableName(name);
  if (typeof value !== 'string') {
    throw new CookieError('INVALID_VALUE', 'Cookie value must be a string.');
  }

  let encodedValue: string;
  try {
    encodedValue = encode(value);
  } catch {
    throw new CookieError('INVALID_VALUE', 'Cookie value must contain valid Unicode.');
  }
  if (utf8ByteLength(encode(name)) + utf8ByteLength(encodedValue) > MAX_COOKIE_PAIR_BYTES) {
    throw new CookieError('INVALID_OPTIONS', 'Encoded cookie name and value exceed the 4096-byte limit.');
  }

  validateOptionsObject(attributes, 'set options');
  validateScope(attributes);

  const { expires, maxAge, sameSite, secure, partitioned, path, domain } = attributes;

  if (maxAge !== undefined && expires !== undefined) {
    throw new CookieError('INVALID_OPTIONS', 'Use either maxAge or expires, not both.');
  }
  if (maxAge !== undefined && (typeof maxAge !== 'number' || !Number.isInteger(maxAge))) {
    throw new CookieError('INVALID_OPTIONS', 'maxAge must be a finite integer number of seconds.');
  }
  if (maxAge !== undefined && maxAge > 0 && maxAge > (MAX_DATE_TIME - Date.now()) / 1000) {
    throw new CookieError('INVALID_OPTIONS', 'maxAge exceeds the supported expiry date range.');
  }

  let normalizedExpires: number | undefined;
  if (expires !== undefined) {
    if (expires instanceof Date) {
      normalizedExpires = expires.getTime();
    } else if (typeof expires === 'number') {
      normalizedExpires = expires;
    } else {
      throw new CookieError('INVALID_OPTIONS', 'expires must be a Date or Unix time in milliseconds.');
    }
    if (!Number.isFinite(normalizedExpires)) {
      throw new CookieError('INVALID_OPTIONS', 'expires must be a Date or Unix time in milliseconds.');
    }
    if (Math.abs(normalizedExpires) > MAX_DATE_TIME) {
      throw new CookieError('INVALID_OPTIONS', 'expires exceeds the supported date range.');
    }
  }

  if (secure !== undefined && typeof secure !== 'boolean') {
    throw new CookieError('INVALID_OPTIONS', 'secure must be a boolean.');
  }
  if (partitioned !== undefined && typeof partitioned !== 'boolean') {
    throw new CookieError('INVALID_OPTIONS', 'partitioned must be a boolean.');
  }
  if (
    sameSite !== undefined &&
    (typeof sameSite !== 'string' || !SAME_SITE_VALUES.includes(sameSite as SameSite))
  ) {
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
