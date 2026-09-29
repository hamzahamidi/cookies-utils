import { afterEach, describe, expect, it } from 'vitest';
import type { CookieError } from '../../src/errors';
import { cookies, type CookieChange } from '../../src/index';

const NAME = 'conformance';

/** Mirrors the rule in selectBackend(), so the test name says which one ran. */
const usesCookieStore =
  globalThis.location.protocol === 'https:' && 'cookieStore' in globalThis;
const selected = usesCookieStore ? 'Cookie Store' : 'document.cookie';
const preservesPartitionedDuplicates = /Chrome\//.test(navigator.userAgent);
const supportsWindowChangeEvents =
  typeof window !== 'undefined' &&
  (() => {
    const store = (
      globalThis as {
        cookieStore?: object & { addEventListener?: unknown; removeEventListener?: unknown };
      }
    ).cookieStore;
    return (
      store !== undefined &&
      store !== null &&
      'onchange' in store &&
      typeof store.addEventListener === 'function' &&
      typeof store.removeEventListener === 'function'
    );
  })();

function waitForNameChange(name: string, field: 'changed' | 'deleted') {
  let unsubscribe = (): void => {};
  const promise = new Promise<CookieChange>((resolve) => {
    unsubscribe = cookies.onChange((change) => {
      if (change[field].some((cookie) => cookie.name === name)) {
        unsubscribe();
        resolve(change);
      }
    });
  });
  return { promise, cancel: () => unsubscribe() };
}

afterEach(async () => {
  await cookies.delete(NAME, { path: '/' });
});

describe('real browser conformance', () => {
  // Without this, a leg whose engine lacks cookieStore would quietly test the
  // other backend and still report a pass. secure: false is the discriminator
  // because the Cookie Store cannot express it and rejects as UNSUPPORTED,
  // while document.cookie simply omits the attribute. Firefox and WebKit
  // report no attributes at all from CookieStore.get(), so the path or secure
  // a cookie reads back as cannot tell the two backends apart.
  it(`goes through the ${selected} backend`, async () => {
    const outcome = await cookies.set(NAME, 'probe', { secure: false }).then(
      () => 'accepted',
      (error) => (error as CookieError).code,
    );
    expect(outcome).toBe(usesCookieStore ? 'UNSUPPORTED' : 'accepted');
  });

  it('round trips a simple cookie', async () => {
    await cookies.set(NAME, 'plain', { path: '/' });
    expect(await cookies.get(NAME)).toBe('plain');
  });

  it('round trips a value needing encoding', async () => {
    await cookies.set(NAME, 'hello world; drop=me', { path: '/' });
    expect(await cookies.get(NAME)).toBe('hello world; drop=me');
  });

  it('accepts SameSite Lax', async () => {
    await cookies.set(NAME, 'lax', { path: '/', sameSite: 'lax' });
    expect(await cookies.get(NAME)).toBe('lax');
  });

  it('accepts SameSite Strict', async () => {
    await cookies.set(NAME, 'strict', { path: '/', sameSite: 'strict' });
    expect(await cookies.get(NAME)).toBe('strict');
  });

  it('treats maxAge zero as an immediate expiry', async () => {
    await cookies.set(NAME, 'gone', { path: '/', maxAge: 0 });
    expect(await cookies.get(NAME)).toBeUndefined();
  });

  it('deletes a cookie it wrote', async () => {
    await cookies.set(NAME, 'temporary', { path: '/' });
    await cookies.delete(NAME, { path: '/' });
    expect(await cookies.has(NAME)).toBe(false);
  });

  it('reports absence as undefined', async () => {
    expect(await cookies.get('never-written')).toBeUndefined();
  });

  it('filters getAll by name through the selected backend', async () => {
    const otherName = `${NAME}-other`;
    try {
      await cookies.set(NAME, 'selected', { path: '/' });
      await cookies.set(otherName, 'ignored', { path: '/' });
      const matches = await cookies.getAll(NAME);
      expect(matches.map(({ name, value }) => ({ name, value }))).toEqual([
        { name: NAME, value: 'selected' },
      ]);
      expect(await cookies.getAll('missing-name')).toEqual([]);
    } finally {
      await cookies.delete(otherName, { path: '/' });
    }
  });

  it.skipIf(!supportsWindowChangeEvents)('reports cookie creation, replacement and deletion', async () => {
    let pending = waitForNameChange(NAME, 'changed');
    try {
      await cookies.set(NAME, 'created', { path: '/' });
      const created = await pending.promise;
      expect(created.changed.find((cookie) => cookie.name === NAME)?.value).toBe('created');

      pending = waitForNameChange(NAME, 'changed');
      await cookies.set(NAME, 'replaced', { path: '/' });
      const replaced = await pending.promise;
      expect(replaced.changed.find((cookie) => cookie.name === NAME)?.value).toBe('replaced');

      pending = waitForNameChange(NAME, 'deleted');
      await cookies.delete(NAME, { path: '/' });
      const deleted = await pending.promise;
      expect(deleted.deleted).toContainEqual({ name: NAME });
    } finally {
      pending.cancel();
      await cookies.delete(NAME, { path: '/' });
    }
  });

  it('returns CookieError for invalid runtime options and prefixes', async () => {
    const badPath = await cookies.set(NAME, 'x', { path: 12 } as never).then(
      () => 'accepted',
      (error) => (error as CookieError).code,
    );
    const badMaxAge = await cookies.set(NAME, 'x', { maxAge: Infinity } as never).then(
      () => 'accepted',
      (error) => (error as CookieError).code,
    );
    const httpPrefix = await cookies.set('__Http-conformance', 'x').then(
      () => 'accepted',
      (error) => (error as CookieError).code,
    );
    expect(badPath).toBe('INVALID_OPTIONS');
    expect(badMaxAge).toBe('INVALID_OPTIONS');
    expect(httpPrefix).toBe('UNSUPPORTED');
  });

  it('rejects an encoded cookie pair over 4096 bytes before writing', async () => {
    const outcome = await cookies.set(NAME, 'é'.repeat(683)).then(
      () => 'accepted',
      (error) => (error as CookieError).code,
    );
    expect(outcome).toBe('INVALID_OPTIONS');
  });

  it.skipIf(!preservesPartitionedDuplicates)('preserves duplicate names with distinct partition keys', async () => {
    const duplicateName = `${NAME}-duplicate-${Math.floor(Math.random() * 1_000_000_000)}`;
    try {
      await cookies.set(duplicateName, 'regular', { path: '/', secure: true, sameSite: 'none' });
      await cookies.set(duplicateName, 'partitioned', {
        path: '/',
        secure: true,
        sameSite: 'none',
        partitioned: true,
      });
      const matching = (await cookies.getAll()).filter((cookie) => cookie.name === duplicateName);
      expect(matching.map((cookie) => cookie.value).sort()).toEqual(['partitioned', 'regular']);
    } finally {
      await cookies.delete(duplicateName, { path: '/', partitioned: true });
      await cookies.delete(duplicateName, { path: '/' });
    }
  });
});
