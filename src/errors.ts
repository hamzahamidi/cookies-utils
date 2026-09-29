/**
 * Discriminates why a CookieError was thrown.
 * INVALID_NAME: the name is empty or contains a control character.
 * INVALID_VALUE: the value is not a string.
 * INVALID_OPTIONS: attributes conflict, for example sameSite 'none' without secure: true.
 * UNSUPPORTED: browser JavaScript or the selected backend cannot perform the operation.
 * NO_COOKIE_ACCESS: neither cookieStore nor document exists in this environment.
 * OPERATION_FAILED: the browser rejected or failed a cookie operation.
 */
export type CookieErrorCode =
  | 'INVALID_NAME'
  | 'INVALID_VALUE'
  | 'INVALID_OPTIONS'
  | 'UNSUPPORTED'
  | 'NO_COOKIE_ACCESS'
  | 'OPERATION_FAILED';

/** Thrown by every public function instead of a silent no-op or a mangled cookie. */
export class CookieError extends Error {
  /** One of the CookieErrorCode values, usable without parsing the message. */
  readonly code: CookieErrorCode;
  declare readonly cause?: unknown;

  constructor(code: CookieErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'CookieError';
    this.code = code;
    if (options !== undefined && 'cause' in options) {
      Object.defineProperty(this, 'cause', { configurable: true, value: options.cause });
    }
  }
}

/** Converts a browser operation failure to the public error contract. */
export function operationFailed(operation: string, cause: unknown): CookieError {
  if (cause instanceof CookieError) return cause;
  return new CookieError('OPERATION_FAILED', `Failed to ${operation} cookie.`, { cause });
}
