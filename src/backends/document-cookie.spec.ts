import { beforeEach, describe, expect, it } from 'vitest';
import { createDocumentCookieBackend, type CookieTarget } from './document-cookie';

/** Records writes instead of applying them, so attributes stay observable. */
class FakeTarget implements CookieTarget {
  writes: string[] = [];
  private header = '';

  constructor(header = '') {
    this.header = header;
  }

  get cookie(): string {
    return this.header;
  }

  set cookie(written: string) {
    this.writes.push(written);
  }
}

describe('document.cookie backend', () => {
  let target: FakeTarget;

  beforeEach(() => {
    target = new FakeTarget('a=1; session=xyz; ab=2');
  });

  it('writes the serialized cookie including attributes', async () => {
    const backend = createDocumentCookieBackend(target);
    await backend.set('token', 'abc', { sameSite: 'lax', path: '/' });
    expect(target.writes).toEqual(['token=abc; Path=/; SameSite=Lax']);
  });

  it('matches names exactly rather than by prefix', async () => {
    const backend = createDocumentCookieBackend(target);
    expect(await backend.get('ses')).toBeUndefined();
    expect(await backend.get('session')).toEqual({ name: 'session', value: 'xyz' });
  });

  it('returns undefined for a cookie that is not there', async () => {
    const backend = createDocumentCookieBackend(target);
    expect(await backend.get('nope')).toBeUndefined();
  });

  it('lists every cookie in header order', async () => {
    const backend = createDocumentCookieBackend(target);
    expect(await backend.getAll()).toEqual([
      { name: 'a', value: '1' },
      { name: 'session', value: 'xyz' },
      { name: 'ab', value: '2' },
    ]);
  });

  it('deletes with Max-Age zero, an epoch Expires and the given scope', async () => {
    const backend = createDocumentCookieBackend(target);
    await backend.delete('a', { path: '/app', domain: 'example.com' });
    expect(target.writes).toEqual([
      'a=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/app; Domain=example.com',
    ]);
  });

  it('asserts Secure when deleting a partitioned cookie', async () => {
    const backend = createDocumentCookieBackend(target);
    await backend.delete('a', { path: '/', partitioned: true });
    expect(target.writes).toEqual([
      'a=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure; Partitioned',
    ]);
  });

  it('does not assert Secure when deleting an unpartitioned cookie', async () => {
    const backend = createDocumentCookieBackend(target);
    await backend.delete('a', { path: '/' });
    expect(target.writes).toEqual([
      'a=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/',
    ]);
  });
});
