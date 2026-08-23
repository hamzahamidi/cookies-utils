/**
 * Discriminates why a CookieError was thrown.
 * INVALID_NAME: the name is empty or contains a control character.
 * INVALID_VALUE: the value is not a string.
 * INVALID_OPTIONS: attributes conflict, for example sameSite 'none' without secure: true.
 * UNSUPPORTED: the selected backend cannot perform the requested operation.
 * NO_COOKIE_ACCESS: neither cookieStore nor document exists in this environment.
 */
export type CookieErrorCode =
  | 'INVALID_NAME'
  | 'INVALID_VALUE'
  | 'INVALID_OPTIONS'
  | 'UNSUPPORTED'
  | 'NO_COOKIE_ACCESS';

/** Thrown by every public function instead of a silent no-op or a mangled cookie. */
export class CookieError extends Error {
  /** One of the CookieErrorCode values, usable without parsing the message. */
  readonly code: CookieErrorCode;

  constructor(code: CookieErrorCode, message: string) {
    super(message);
    this.name = 'CookieError';
    this.code = code;
  }
}
