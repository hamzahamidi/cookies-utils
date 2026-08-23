import { afterEach, describe, expect, it } from 'vitest';
import { createCookieStoreBackend, type CookieStoreLike } from '../../src/backends/cookie-store';
import { createDocumentCookieBackend } from '../../src/backends/document-cookie';

/**
 * These suites bypass selectBackend() and drive each backend through its own
 * factory, so both run in a real browser on every engine. Going through
 * selectBackend() only ever exercises whichever one it picks, which left
 * serialize() and parse() with no real browser coverage at all.
 */

const store = (globalThis as unknown as { cookieStore?: CookieStoreLike }).cookieStore;

describe('document.cookie backend in a real browser', () => {
  const backend = createDocumentCookieBackend(document);
  const NAME = 'direct-dc';

  afterEach(async () => {
    await backend.delete(NAME, { path: '/' });
  });

  it('round trips a set and a get', async () => {
    await backend.set(NAME, 'plain', { path: '/' });
    expect(await backend.get(NAME)).toEqual({ name: NAME, value: 'plain' });
  });

  it('round trips an attribute bearing write', async () => {
    await backend.set(NAME, 'attrs', {
      path: '/',
      maxAge: 600,
      sameSite: 'lax',
      secure: true,
    });
    expect(await backend.get(NAME)).toEqual({ name: NAME, value: 'attrs' });
  });

  it('lists what it wrote through getAll', async () => {
    await backend.set(NAME, 'listed', { path: '/' });
    expect(await backend.getAll()).toContainEqual({ name: NAME, value: 'listed' });
  });

  it('deletes a cookie it wrote', async () => {
    await backend.set(NAME, 'temporary', { path: '/' });
    await backend.delete(NAME, { path: '/' });
    expect(await backend.get(NAME)).toBeUndefined();
  });

  it('expires a cookie at once on maxAge zero', async () => {
    await backend.set(NAME, 'gone', { path: '/', maxAge: 0 });
    expect(await backend.get(NAME)).toBeUndefined();
  });
});

// Skipped visibly, never silently, when the engine has no Cookie Store: a leg
// that cannot run this suite must say so rather than report a pass.
describe.skipIf(store === undefined)('Cookie Store backend in a real browser', () => {
  const backend = createCookieStoreBackend(store as CookieStoreLike);
  const NAME = 'direct-cs';

  afterEach(async () => {
    await backend.delete(NAME, { path: '/' });
  });

  it('round trips a set and a get', async () => {
    await backend.set(NAME, 'plain', { path: '/' });
    expect(await backend.get(NAME)).toMatchObject({ name: NAME, value: 'plain' });
  });

  it('round trips an attribute bearing write', async () => {
    await backend.set(NAME, 'attrs', { path: '/', maxAge: 600, sameSite: 'lax' });
    expect(await backend.get(NAME)).toMatchObject({ name: NAME, value: 'attrs' });
  });

  it('lists what it wrote through getAll', async () => {
    await backend.set(NAME, 'listed', { path: '/' });
    const listed = (await backend.getAll()).find((cookie) => cookie.name === NAME);
    expect(listed).toMatchObject({ name: NAME, value: 'listed' });
  });

  it('deletes a cookie it wrote', async () => {
    await backend.set(NAME, 'temporary', { path: '/' });
    await backend.delete(NAME, { path: '/' });
    expect(await backend.get(NAME)).toBeUndefined();
  });

  it('expires a cookie at once on maxAge zero, which it sends as an expires', async () => {
    await backend.set(NAME, 'gone', { path: '/', maxAge: 0 });
    expect(await backend.get(NAME)).toBeUndefined();
  });
});
