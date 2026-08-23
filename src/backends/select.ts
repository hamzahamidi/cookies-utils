import { CookieError } from '../errors';
import type { Backend } from '../types';
import { createCookieStoreBackend, type CookieStoreLike } from './cookie-store';
import { createDocumentCookieBackend, type CookieTarget } from './document-cookie';

/**
 * True when globalThis.location reports a protocol other than https:. WebKit
 * does not persist cookieStore.set() writes on plain http origins even
 * though it reports isSecureContext: true there, so isSecureContext cannot
 * be used to detect this; the URL scheme is the only reliable signal. A
 * missing or unreadable location (a service worker, or any non-browser
 * context) counts as "not http" so behaviour there is unchanged.
 */
function isPlainHttpOrigin(): boolean {
  try {
    const location = (globalThis as { location?: unknown }).location;
    if (typeof location !== 'object' || location === null) return false;
    const protocol = (location as { protocol?: unknown }).protocol;
    return typeof protocol === 'string' && protocol !== 'https:';
  } catch {
    return false;
  }
}

/**
 * True only for a document that can actually carry cookies. A bare object,
 * which a test double or an SSR shim may install as globalThis.document, would
 * otherwise be chosen here and then fail inside parse() with a TypeError
 * instead of a CookieError.
 */
function canCarryCookies(target: CookieTarget | undefined): target is CookieTarget {
  return typeof target?.cookie === 'string';
}

/** Detection runs per call, never at module evaluation, so importing stays SSR safe. */
export function selectBackend(): Backend {
  const scope = globalThis as Record<string, unknown>;
  const target = scope.document as CookieTarget | undefined;

  // On a plain http origin, prefer document.cookie over Cookie Store even
  // when both exist: WebKit silently drops cookieStore.set() writes there.
  // The canCarryCookies guard matters on its own, separately from https:
  // a service worker has cookieStore but no document at all, so without
  // this guard a plain http service worker would fall through to the
  // NO_COOKIE_ACCESS branch below instead of using the Cookie Store it has.
  if (isPlainHttpOrigin() && canCarryCookies(target)) {
    return createDocumentCookieBackend(target);
  }

  const store = scope.cookieStore as CookieStoreLike | undefined;
  if (store !== undefined && store !== null) {
    return createCookieStoreBackend(store);
  }

  if (canCarryCookies(target)) {
    return createDocumentCookieBackend(target);
  }

  throw new CookieError(
    'NO_COOKIE_ACCESS',
    'No cookieStore and no document. Cookies are unavailable in this environment.',
  );
}
