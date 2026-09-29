# Migrating from 1.0.0 to 2.x

This guide covers the breaking changes between cookies-utils 1.0.0 and 2.0.0. The API and behaviors described here remain relevant to current 2.x releases.

The 1.x cookie operations now have async replacements and use positional arguments.

| 1.0.0 | 2.0.0 |
| --- | --- |
| `getCookieValue(name)` | `await get(name)` |
| `setCookie({ name, value, ...opts })` | `await set(name, value, opts)` |
| `cookieExists(name)` | `await has(name)` |
| `cookieHasValue(name, value)` | closest equivalent: `(await get(name)) === value` |
| `deleteCookie(name, path, domain)` | `await cookies.delete(name, { path, domain })` |
| `deleteAllCookies()` | removed |

`cookieHasValue` is the one row that is not an exact swap, only the closest
equivalent. It compared the raw header text after trimming, so it matched percent
encoded values and ignored surrounding whitespace. `await get(name)` returns the
decoded value and compares exactly. That is a deliberate correction, not a
like for like replacement.

The rest of this section covers what the table above does not: a decoding
trap almost every 1.0.0 call site hits, two default attributes that change
what a caller sends without changing the call site, a list of inputs 1.0.0
tolerated that 2.0.0 now rejects, and the current option and error reference in the [README](README.md#options).

### The default path can shadow a 1.0.0 cookie

1.0.0's `setCookie` wrote no `path` when the caller omitted one, so those
cookies live at the writing page's directory, for example `/app`; 2.0.0
defaults `path` to `"/"`. After upgrading, `set(name, value)` writes a new
cookie at `/` while the 1.0.0 cookie stays at `/app`, and since
`document.cookie` lists the more specific path first, `get()` returns the
first match it finds there and keeps reporting the stale `/app` value with no
error, while `delete(name)` now targets `/` and never clears the old one.
Delete the old cookie at its original path before or during the upgrade:
`await cookies.delete("session", { path: "/app" })`.

### The default SameSite changes cross-site behavior

1.0.0 serialized `sameSite` as `'; samesite' + value` with no `=`, so
browsers discarded the attribute and no cookie 1.0.0 ever wrote carried a
SameSite value, whatever the caller passed. 2.0.0 writes an explicit
`SameSite=Lax` by default, which is never looser than an implicit default, so
the only realistic breakage is a cookie that used to be sent on a cross-site
request and now is not: a cross-site subresource or credentialed
cross-origin fetch, or a top-level cross-site POST returning to the site
(SAML or a payment provider return), which loses Chromium's
Lax-allowing-unsafe grace period. There is no way to write a cookie with no
SameSite attribute at all, since the default always applies; for cross-site
use, pass `sameSite: "none"` with `secure: true`.

### Delete your own decodeURIComponent call

1.0.0's `setCookie` percent-encoded a value on write, and `getCookieValue`
never decoded on read. Working 1.0.0 code very often reads:

```javascript
const value = decodeURIComponent(getCookieValue("session"));
```

`get()` in 2.0.0 already decodes the value it reads, leniently: a foreign
cookie holding a lone `%` comes back unchanged rather than throwing. Carrying
the same wrapper over now decodes twice:

```javascript
// Wrong after migrating: get() already decoded this once.
const value = decodeURIComponent(await get("session"));
```

A value containing a literal percent sequence is mangled by the second
decode, and a value ending in a lone `%` throws `URIError: URI malformed`,
from your own wrapper rather than from this library. Delete the wrapper:

```javascript
const value = await get("session");
```

### Inputs 1.0.0 tolerated that 2.0.0 rejects

`set()` throws `CookieError` instead of writing a cookie 1.0.0 would have
written, for:

- a value that is not a string, for example `set("a", 123)`
- `maxAge` and `expires` supplied together
- `sameSite: "none"` without `secure: true`
- a `sameSite` value that is not exactly `"strict"`, `"lax"` or `"none"`,
  for example the capitalized `"Lax"`
- a `maxAge` that is not an integer
- a `__Secure-` prefixed name without `secure: true`
- a `__Host-` prefixed name without `secure: true`, with a `domain`, or
  (only if you pass an explicit `path` other than `"/"`) with any other path;
  `path` defaults to `"/"`, so `set("__Host-a", "b", { secure: true })`
  already satisfies the path rule on its own
- `partitioned: true` without `secure: true`
- a `path` or `domain` containing a semicolon or a control character
- an option whose runtime type is wrong, an empty or relative path, or an
  obviously malformed domain
- an encoded name and value pair over 4096 bytes, or a UTF-8 path or domain
  over 1024 bytes
- a write or delete using `__Http-` or `__Host-Http-`, since those prefixes
  require `HttpOnly` and must be set by a server using `Set-Cookie`

Anything your 1.0.0 code relied on being silently tolerated in this list now
gets a rejection, before anything is written. See the [README error reference](README.md#errors-and-environment-support) for
which `CookieErrorCode` each case throws.

`get("")` and `has("")` changed too, on the read side, and so did a
non-string name: `get(123)` was silently coerced to text before the match in
1.0.0. 1.0.0-equivalent code that looked up an empty name got back
`undefined` or `false`. Both now reject with `INVALID_NAME`, along with every
other empty, non-string or control-character name.

### The removed `deleteAllCookies()` method

`deleteAllCookies()` was removed rather than fixed. It could not read the path or
domain of anything it found and could not see `HttpOnly` cookies, so it under
deleted silently in exactly the logout flows that used it. There is no direct
replacement: delete your own known cookie names, which an application has by
definition, rather than routing them back through `getAll()`:

```javascript
for (const name of ["session", "csrf-token"]) {
  await cookies.delete(name, { path: "/" });
}
```

There is no general purge, for two independent reasons. First, the
`document.cookie` backend cannot read the path of a cookie it finds, so a name
read from `getAll()` carries no path to delete it with. Second, `getAll()`
returns decoded names, and encoding a decoded name does not always reproduce the
wire name it came from: `decode("100%")` returns `"100%"` (the lone `%` is not a
valid escape, so decoding leaves it alone) while `encode("100%")` returns
`"100%25"`. A name read back from `getAll()` and passed to `delete` can
therefore target a different wire name than the one you read. Keep your own list
of names instead of deriving one from `getAll()`.
