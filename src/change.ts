import { decode } from './codec';
import { CookieError } from './errors';
import type { Cookie } from './types';

/** A deleted cookie's value is not included in the native change event. */
export interface DeletedCookie {
  name: string;
}

/** Normalized window Cookie Store change data. */
export interface CookieChange {
  changed: Cookie[];
  deleted: DeletedCookie[];
}

export type CookieChangeHandler = (change: CookieChange) => void;

interface CookieStoreEventSource {
  onchange: unknown;
  addEventListener(type: 'change', listener: EventListener): void;
  removeEventListener(type: 'change', listener: EventListener): void;
}

function changedCookie(item: CookieListItem): Cookie {
  if (typeof item.name !== 'string' || typeof item.value !== 'string') {
    throw new CookieError('OPERATION_FAILED', 'The browser sent an invalid changed cookie.');
  }
  return { name: decode(item.name), value: decode(item.value) };
}

function deletedCookie(item: CookieListItem): DeletedCookie {
  if (typeof item.name !== 'string') {
    throw new CookieError('OPERATION_FAILED', 'The browser sent an invalid deleted cookie.');
  }
  return { name: decode(item.name) };
}

function unsupported(): CookieError {
  return new CookieError(
    'UNSUPPORTED',
    'Cookie change events require the native Cookie Store API in a Window context.',
  );
}

/** Subscribes to native Window Cookie Store change events. */
export function onChange(handler: CookieChangeHandler): () => void {
  if (typeof handler !== 'function') {
    throw new CookieError('INVALID_OPTIONS', 'change handler must be a function.');
  }
  if (typeof window === 'undefined') throw unsupported();

  let candidate: unknown;
  try {
    candidate = (globalThis as Record<string, unknown>).cookieStore;
  } catch (cause) {
    throw new CookieError('OPERATION_FAILED', 'Failed to access cookie change events.', { cause });
  }

  let store: CookieStoreEventSource | undefined;
  let supportsChangeEvents = false;
  try {
    if (typeof candidate === 'object' && candidate !== null && 'onchange' in candidate) {
      store = candidate as CookieStoreEventSource;
      supportsChangeEvents =
        typeof store.addEventListener === 'function' && typeof store.removeEventListener === 'function';
    }
  } catch (cause) {
    throw new CookieError('OPERATION_FAILED', 'Failed to inspect cookie change event support.', { cause });
  }
  if (!supportsChangeEvents || store === undefined) {
    throw unsupported();
  }

  const listener: EventListener = (event) => {
    const changeEvent = event as CookieChangeEvent;
    handler({
      changed: Array.from(changeEvent.changed, changedCookie),
      deleted: Array.from(changeEvent.deleted, deletedCookie),
    });
  };

  try {
    store.addEventListener('change', listener);
  } catch (cause) {
    throw new CookieError('OPERATION_FAILED', 'Failed to subscribe to cookie changes.', { cause });
  }

  let subscribed = true;
  return () => {
    if (!subscribed) return;
    try {
      store.removeEventListener('change', listener);
      subscribed = false;
    } catch (cause) {
      throw new CookieError('OPERATION_FAILED', 'Failed to unsubscribe from cookie changes.', { cause });
    }
  };
}
