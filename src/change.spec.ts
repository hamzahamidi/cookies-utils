import { afterEach, describe, expect, it, vi } from 'vitest';
import { CookieError } from './errors';
import { cookies, onChange, type CookieChange } from './index';

const globalRef = globalThis as Record<string, unknown>;

class FakeCookieStore {
  onchange: unknown = null;
  readonly listeners = new Set<EventListener>();

  addEventListener(_type: 'change', listener: EventListener): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'change', listener: EventListener): void {
    this.listeners.delete(listener);
  }

  dispatch(changed: CookieListItem[] = [], deleted: CookieListItem[] = []): void {
    const event = { changed, deleted } as unknown as Event;
    for (const listener of this.listeners) listener(event);
  }
}

afterEach(() => {
  delete globalRef.window;
  delete globalRef.cookieStore;
});

describe('cookie change events', () => {
  it('normalizes and decodes native change data through both exports', () => {
    const store = new FakeCookieStore();
    globalRef.window = {};
    globalRef.cookieStore = store;
    const received: CookieChange[] = [];
    const unsubscribe = cookies.onChange((change) => received.push(change));

    store.dispatch(
      [{ name: 'theme%20mode', value: 'night%20mode' }],
      [{ name: 'old%20name', value: undefined }],
    );

    expect(received).toEqual([
      {
        changed: [{ name: 'theme mode', value: 'night mode' }],
        deleted: [{ name: 'old name' }],
      },
    ]);
    unsubscribe();
    expect(store.listeners.size).toBe(0);

    const namedHandler = vi.fn();
    const unsubscribeNamed = onChange(namedHandler);
    store.dispatch([{ name: 'a', value: 'b' }]);
    expect(namedHandler).toHaveBeenCalledWith({ changed: [{ name: 'a', value: 'b' }], deleted: [] });
    unsubscribeNamed();
  });

  it('removes listeners and makes unsubscribe idempotent', () => {
    const store = new FakeCookieStore();
    globalRef.window = {};
    globalRef.cookieStore = store;
    const handler = vi.fn();
    const unsubscribe = onChange(handler);

    unsubscribe();
    unsubscribe();
    store.dispatch([{ name: 'a', value: 'b' }]);

    expect(store.listeners.size).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects invalid handlers and unsupported contexts explicitly', () => {
    expect(() => onChange(null as never)).toThrowError(expect.objectContaining({ code: 'INVALID_OPTIONS' }));

    const store = new FakeCookieStore();
    globalRef.cookieStore = store;
    expect(() => onChange(() => {})).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED' }));

    globalRef.window = {};
    globalRef.cookieStore = {};
    expect(() => onChange(() => {})).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED' }));

    globalRef.cookieStore = {
      addEventListener() {},
      removeEventListener() {},
    };
    expect(() => onChange(() => {})).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED' }));
  });

  it('preserves separate event records that share a cookie name', () => {
    const store = new FakeCookieStore();
    globalRef.window = {};
    globalRef.cookieStore = store;
    const handler = vi.fn();
    onChange(handler);

    store.dispatch([
      { name: 'theme', value: 'dark' },
      { name: 'theme', value: 'light' },
    ]);

    expect(handler).toHaveBeenCalledWith({
      changed: [
        { name: 'theme', value: 'dark' },
        { name: 'theme', value: 'light' },
      ],
      deleted: [],
    });
  });

  it('normalizes subscription and unsubscription failures with their causes', () => {
    const subscribeCause = new TypeError('registration failed');
    globalRef.window = {};
    globalRef.cookieStore = {
      onchange: null,
      addEventListener() {
        throw subscribeCause;
      },
      removeEventListener() {},
    };
    let subscriptionError: unknown;
    try {
      onChange(() => {});
    } catch (error) {
      subscriptionError = error;
    }
    expect(subscriptionError).toBeInstanceOf(CookieError);
    expect(subscriptionError).toMatchObject({ code: 'OPERATION_FAILED' });
    expect((subscriptionError as CookieError).cause).toBe(subscribeCause);

    const unsubscribeCause = new TypeError('removal failed');
    const store = new FakeCookieStore();
    store.removeEventListener = () => {
      throw unsubscribeCause;
    };
    globalRef.cookieStore = store;
    const unsubscribe = onChange(() => {});
    let unsubscribeError: unknown;
    try {
      unsubscribe();
    } catch (error) {
      unsubscribeError = error;
    }
    expect(unsubscribeError).toBeInstanceOf(CookieError);
    expect(unsubscribeError).toMatchObject({ code: 'OPERATION_FAILED' });
    expect((unsubscribeError as CookieError).cause).toBe(unsubscribeCause);
  });

  it('rejects malformed native event items with OPERATION_FAILED', () => {
    const store = new FakeCookieStore();
    globalRef.window = {};
    globalRef.cookieStore = store;
    const handler = vi.fn();
    onChange(handler);

    expect(() => store.dispatch([{ name: 'a' }])).toThrowError(
      expect.objectContaining({ code: 'OPERATION_FAILED' }),
    );
    expect(handler).not.toHaveBeenCalled();
  });
});
