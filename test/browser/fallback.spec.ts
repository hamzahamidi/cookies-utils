import { afterEach, describe, expect, it } from 'vitest';
import type { CookieError } from '../../src/errors';
import { cookies } from '../../src/index';

/**
 * Drives the public API over the document.cookie fallback in a real browser,
 * which is what every non-https origin and every engine without a Cookie Store
 * gets. Every Playwright engine ships a CookieStore, so the only way to reach
 * that path here is to remove the global. Vitest gives each spec file its own
 * iframe, so this affects no other suite; if that ever stopped holding, the
 * discriminator in conformance.spec.ts would fail rather than go quiet.
 */
delete (globalThis as unknown as Record<string, unknown>).cookieStore;

const NAME = 'fallback';

afterEach(async () => {
  await cookies.delete(NAME, { path: '/' });
});

describe('document.cookie fallback through the public API', () => {
  it('selects document.cookie once there is no Cookie Store', async () => {
    const outcome = await cookies.set(NAME, 'probe', { secure: false }).then(
      () => 'accepted',
      (error) => (error as CookieError).code,
    );
    expect(outcome).toBe('accepted');
  });

  it('round trips a value needing encoding', async () => {
    await cookies.set(NAME, 'hello world; drop=me');
    expect(await cookies.get(NAME)).toBe('hello world; drop=me');
  });

  it('answers has for a cookie it wrote', async () => {
    await cookies.set(NAME, 'present');
    expect(await cookies.has(NAME)).toBe(true);
  });

  it('deletes a cookie it wrote', async () => {
    await cookies.set(NAME, 'temporary');
    await cookies.delete(NAME);
    expect(await cookies.has(NAME)).toBe(false);
  });

  it('treats maxAge zero as an immediate expiry', async () => {
    await cookies.set(NAME, 'gone', { maxAge: 0 });
    expect(await cookies.get(NAME)).toBeUndefined();
  });

  it('reports absence as undefined', async () => {
    expect(await cookies.get('never-written')).toBeUndefined();
  });
});
