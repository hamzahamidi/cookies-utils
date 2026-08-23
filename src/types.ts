export type SameSite = 'strict' | 'lax' | 'none';

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
