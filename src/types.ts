/** The SameSite attribute values a cookie can declare. */
export type SameSite = 'strict' | 'lax' | 'none';

/**
 * Attributes accepted by set(). Every field is applied only when it is
 * !== undefined, so maxAge: 0 (expire immediately) is distinguishable from
 * omitting maxAge entirely.
 */
export interface CookieAttributes {
  path?: string;
  domain?: string;
  /** A Date, or Unix time in milliseconds. */
  expires?: Date | number;
  /** Seconds. Zero or negative expires the cookie immediately. */
  maxAge?: number;
  secure?: boolean;
  sameSite?: SameSite;
  partitioned?: boolean;
}

/**
 * A cookie as read back by get() or getAll(). Fields beyond name and value are
 * populated only by the Cookie Store backend; the document.cookie backend can
 * report a name and value only.
 */
export interface Cookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: number;
  secure?: boolean;
  sameSite?: SameSite;
  partitioned?: boolean;
}

/**
 * Attributes accepted by delete(). A path or domain that does not match the
 * cookie's own is a silent no-op, since deletion works by writing an expired
 * cookie and the browser only overwrites a cookie whose path and domain match.
 */
export type DeleteOptions = Pick<CookieAttributes, 'path' | 'domain' | 'partitioned'>;

/** Attributes after validation, where expires is always Unix milliseconds. */
export interface NormalizedAttributes extends Omit<CookieAttributes, 'expires'> {
  expires?: number;
}

/** Backends deal only in encoded wire names and values. */
export interface Backend {
  get(name: string): Promise<Cookie | undefined>;
  getAll(): Promise<Cookie[]>;
  set(name: string, value: string, attributes: NormalizedAttributes): Promise<void>;
  delete(name: string, options: DeleteOptions): Promise<void>;
}
