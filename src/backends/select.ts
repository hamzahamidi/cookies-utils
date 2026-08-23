import { CookieError } from '../errors';
import type { Backend } from '../types';
import { createCookieStoreBackend, type CookieStoreLike } from './cookie-store';
import { createDocumentCookieBackend, type CookieTarget } from './document-cookie';

/** Detection runs per call, never at module evaluation, so importing stays SSR safe. */
export function selectBackend(): Backend {
  const scope = globalThis as Record<string, unknown>;

  const store = scope.cookieStore as CookieStoreLike | undefined;
  if (store !== undefined && store !== null) {
    return createCookieStoreBackend(store);
  }

  const target = scope.document as CookieTarget | undefined;
  if (target !== undefined && target !== null) {
    return createDocumentCookieBackend(target);
  }

  throw new CookieError(
    'NO_COOKIE_ACCESS',
    'No cookieStore and no document. Cookies are unavailable in this environment.',
  );
}
