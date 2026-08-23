import { afterEach, describe, expect, it } from 'vitest';
import type { CookieError } from '../../src/errors';
import { cookies } from '../../src/index';

const NAME = 'conformance';

/** Mirrors the rule in selectBackend(), so the test name says which one ran. */
const usesCookieStore =
  globalThis.location.protocol === 'https:' && 'cookieStore' in globalThis;
const selected = usesCookieStore ? 'Cookie Store' : 'document.cookie';

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
});
