# Security policy

## Report a vulnerability

Private vulnerability reporting is enabled for this repository. Use the
[private reporting form on the Security tab](https://github.com/hamzahamidi/cookies-utils/security/advisories/new).
Do not disclose an unpatched vulnerability in a public issue. Include the
affected package version, the security impact, and reproducible steps when
possible.

## Cookie security limits

`cookies-utils` reads and writes browser cookies. It is not an authentication
system and does not make a client-readable value safe to trust.

* Browser JavaScript cannot read or write `HttpOnly` cookies. Create them on the
  server with `Set-Cookie`.
* Cookie prefixes such as `__Host-` and `__Secure-` enforce browser rules. They
  do not replace server-side authorization or session controls.
* `Path` controls when a cookie is sent. It is not a security boundary between
  applications on one host.
* `SameSite` provides defense in depth. It is not a complete CSRF defense.
* `Secure` limits cookie transmission to secure connections. It does not encrypt
  the cookie value.
* A session token readable by JavaScript can be stolen by an XSS vulnerability.
  Do not store credentials or secrets in client-readable cookies.
* This package does not bypass third-party-cookie restrictions or partitioning
  rules imposed by browsers.
