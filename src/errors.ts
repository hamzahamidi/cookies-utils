export type CookieErrorCode =
  | 'INVALID_NAME'
  | 'INVALID_VALUE'
  | 'INVALID_OPTIONS'
  | 'UNSUPPORTED'
  | 'NO_COOKIE_ACCESS';

export class CookieError extends Error {
  readonly code: CookieErrorCode;

  constructor(code: CookieErrorCode, message: string) {
    super(message);
    this.name = 'CookieError';
    this.code = code;
  }
}
