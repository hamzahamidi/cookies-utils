import { afterEach, describe, expect, it } from 'vitest';
import { cookies } from '../../src/index';

const NAME = 'conformance';

afterEach(async () => {
  await cookies.delete(NAME, { path: '/' });
});

describe('real browser conformance', () => {
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
